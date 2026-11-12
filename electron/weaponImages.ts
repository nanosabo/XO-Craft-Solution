import { app, net, protocol } from "electron";
import axios from "axios";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getBaseUrls } from "./crossoutInfo";
const KEY_PATTERN = /^[A-Za-z0-9_.-]{1,160}$/;

const inflight = new Map<string, Promise<string | null>>();
const missing = new Set<string>();

const cacheDir = () => path.join(app.getPath("userData"), "weapon-images");

const fileFor = (key: string) => path.join(cacheDir(), `${key}.png`);

const isPng = (body: Buffer): boolean =>
  body.length > 32 &&
  body[0] === 0x89 &&
  body[1] === 0x50 &&
  body[2] === 0x4e &&
  body[3] === 0x47;

/** Stable renderer URL. The protocol handler downloads the file on the first request. */
export const weaponImageSrc = (key: string): string => {
  if (!KEY_PATTERN.test(key)) return "";

  return `weapon://cache/${encodeURIComponent(key)}.png`;
};

const downloadWeaponImage = async (key: string): Promise<string | null> => {
  const file = fileFor(key);

  try {
    const stat = await fs.promises.stat(file);

    if (stat.isFile() && stat.size > 32) return file;
  } catch {
    /* Not cached yet. */
  }

  if (missing.has(key)) return null;

  await fs.promises.mkdir(cacheDir(), { recursive: true });

  for (const host of await getBaseUrls()) {
    try {
      const response = await axios.get<ArrayBuffer>(
        `${host}/public/images/weapons/${encodeURIComponent(key)}.png`,
        {
          responseType: "arraybuffer",
          timeout: 20_000,
          headers: {
            "User-Agent": `XO-Craft-Solution/${app.getVersion()}`,
            Accept: "image/png,image/*",
          },
          validateStatus: (status) => status >= 200 && status < 300,
        },
      );
      const body = Buffer.from(response.data);

      if (!isPng(body)) continue;

      const temp = `${file}.${process.pid}.part`;

      await fs.promises.writeFile(temp, body);
      await fs.promises.rename(temp, file);

      return file;
    } catch {
      /* Try the mirror. */
    }
  }

  missing.add(key);

  return null;
};

export const ensureWeaponImage = (key: string): Promise<string | null> => {
  if (!KEY_PATTERN.test(key)) return Promise.resolve(null);

  const pending = inflight.get(key);

  if (pending) return pending;

  const job = downloadWeaponImage(key).finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, job);

  return job;
};

export const prefetchWeaponImages = (keys: Iterable<string>): void => {
  for (const key of keys) {
    void ensureWeaponImage(key);
  }
};

/** Must run before the app is ready. */
export const installWeaponScheme = (): void => {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "weapon",
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
};

/** Serves cached weapon icons and downloads a missing file once. */
export const registerWeaponProtocol = (): void => {
  protocol.handle("weapon", async (request) => {
    try {
      const url = new URL(request.url);
      const name = decodeURIComponent(url.pathname.split("/").pop() ?? "");
      const key = name.replace(/\.png$/i, "");
      const file = await ensureWeaponImage(key);

      if (!file) return new Response(null, { status: 404 });

      return net.fetch(pathToFileURL(file).href);
    } catch {
      return new Response(null, { status: 404 });
    }
  });
};
