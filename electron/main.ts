import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  shell,
  Tray,
  Notification,
  screen,
} from "electron";
import type { OpenDialogOptions } from "electron";
import fs from "fs";
import path from "node:path";
import { spawn } from "child_process";
import { solveInputsState } from "@src/store/slices/solveInputs.slice";
import { requiredPart } from "@src/store/slices/requiredParts.slice";
import { fetchItems } from "./fetchItems";
import { IData, OwnRecipe } from "@src/store/slices/market.slice";
import { getEnhancedAnalytics, IItem } from "./craftItemsCalc";
import { getOneItem } from "./oneItemCalc";
import { fetchUpdate } from "./fetchUpdate";
import { getServerActionId } from "./actionIds";
import { buildChartData, fetchChartData } from "./fetchChartData";
import { autoUpdater } from "electron-updater";
import locales from "./locales.json";
import axios from "axios";

app.setAppUserModelId("xo.craft.solution");

autoUpdater.allowPrerelease = true;

const IS_DEV = !app.isPackaged;

const solverBinary =
  process.platform === "win32" ? "knapsack-solver.exe" : "knapsack-solver";

const exePath = IS_DEV
  ? path.resolve(__dirname, `../build/solver/${solverBinary}`)
  : path.resolve(process.resourcesPath, `build/solver/${solverBinary}`);

const iconFile = process.platform === "win32" ? "icon.ico" : "icon.png";

const iconPath = IS_DEV
  ? path.resolve(__dirname, `../build/${iconFile}`)
  : path.resolve(process.resourcesPath, `build/${iconFile}`);

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, "../dist");
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, "../public");

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}

app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
});

let win: BrowserWindow | null;
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];

interface Part {
  id: string;
  category: string;
  name: string;
  eng_name: string;
  power: number;
  durability: number;
  weight: number;
  maxCount: number;
  build_hp: number;
}

let actualParts: Part[] = [];
let lang: "ru" | "en" = "ru";

export const getLanguage = () => {
  return lang;
};

const statePath = path.join(app.getPath("userData"), "window-state.json");

interface WindowState {
  x?: number;
  y?: number;
}

const RELEASE_REPO = "nanosabo/XO-Craft-Solution";

const updateInfoPath = path.join(app.getPath("userData"), "update-info.json");

interface StoredUpdateInfo {
  version: string;
  releaseNotes: string | null;
}

/**
 * The release notes are known while checking for an update, i.e. before the app
 * is restarted. Persisting them lets the patchnote window work without a second
 * request to GitHub after the update.
 */
const saveUpdateInfo = (info: StoredUpdateInfo) => {
  try {
    fs.writeFileSync(updateInfoPath, JSON.stringify(info), "utf8");
  } catch {
    /* The cache is only an optimization for the release-notes window. */
  }
};

const readUpdateInfo = (): StoredUpdateInfo | null => {
  try {
    return JSON.parse(fs.readFileSync(updateInfoPath, "utf8"));
  } catch {
    return null;
  }
};

const WIDTH = 1160;
const HEIGHT = 650;

function createWindow() {
  let x: number | undefined;
  let y: number | undefined;

  try {
    if (fs.existsSync(statePath)) {
      const state: WindowState = JSON.parse(fs.readFileSync(statePath, "utf8"));

      const display = screen.getDisplayMatching({
        x: state.x || 0,
        y: state.y || 0,
        width: WIDTH,
        height: HEIGHT,
      });

      if (display) {
        x = state.x;
        y = state.y;
      }
    }
  } catch (err) {
    console.error("Failed to load window state:", err);
  }

  win = new BrowserWindow({
    width: 1160,
    height: 650,
    x,
    y,
    resizable: false,
    autoHideMenuBar: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      devTools: IS_DEV,
    },
  });

  win.webContents.on("before-input-event", (event, input) => {
    const isF11 = input.key === "F11";
    const isReload =
      !IS_DEV &&
      (input.control || input.meta) &&
      input.key.toLowerCase() === "r";

    if (isF11 || isReload) {
      event.preventDefault();
    }
  });

  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
    win?.webContents.openDevTools();

    win?.webContents.setWindowOpenHandler(() => {
      return { action: "deny" };
    });
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on("minimize", (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  win?.minimize();
});

ipcMain.on("close", () => {
  // const win = BrowserWindow.fromWebContents(e.sender);
  // win?.close();
  win?.hide();
  const notification = new Notification({
    title: locales[lang].hide.title,
    body: locales[lang].hide.body,
    icon: iconPath,
  });

  notification.show();
});

ipcMain.on("openDiscordExternal", () => {
  shell.openExternal("https://discord.gg/cwtHShAfZx");
});

ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

ipcMain.handle("get-is-mirror", () => {
  return isMirror;
});

ipcMain.handle("get-update-info", () => {
  return readUpdateInfo();
});

/**
 * github.com does not send CORS headers on the Atom feed, so the renderer
 * cannot request it directly. The main process has no such restriction.
 */
ipcMain.handle("get-release-feed", async () => {
  try {
    const { data } = await axios.get(
      `https://github.com/${RELEASE_REPO}/releases.atom`,
      { responseType: "text", timeout: 15000 },
    );

    return typeof data === "string" ? data : null;
  } catch {
    return null;
  }
});

ipcMain.handle("check-for-updates", async () => {
  try {
    const result = await autoUpdater.checkForUpdatesAndNotify({
      title: locales[lang].update.title,
      body: locales[lang].update.body,
    });

    const updateInfo = result?.updateInfo;

    if (updateInfo?.version) {
      const notes = updateInfo.releaseNotes;

      saveUpdateInfo({
        version: updateInfo.version,
        releaseNotes: Array.isArray(notes)
          ? notes
              .map((note) => note.note ?? "")
              .filter(Boolean)
              .join("\n\n")
          : notes ?? null,
      });
    }

    return {
      ok: true,
      current: app.getVersion(),
      latest: updateInfo?.version ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      current: app.getVersion(),
      message: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle(
  "show-notification",
  (
    _,
    { title, body, icon }: { title: string; body: string; icon?: string },
  ) => {
    if (!Notification.isSupported()) return false;

    let notificationIcon: Electron.NativeImage | string = iconPath;

    if (icon) {
      try {
        const image = nativeImage.createFromDataURL(icon);

        if (!image.isEmpty()) {
          notificationIcon = image;
        }
      } catch {
        /* Fall back to the application icon. */
      }
    }

    const notification = new Notification({
      title,
      body,
      icon: notificationIcon,
    });

    notification.on("click", () => {
      win?.show();
      win?.focus();
    });

    notification.show();
    return true;
  },
);

ipcMain.handle("open-external", async (_, url: string) => {
  if (!/^https?:\/\//i.test(url)) return false;

  await shell.openExternal(url);
  return true;
});

ipcMain.handle("open-user-data", async () => {
  await shell.openPath(app.getPath("userData"));
  return true;
});

/* ---------------- custom notification sound ---------------- */

const SOUNDS_DIR = path.join(app.getPath("userData"), "sounds");
const CUSTOM_SOUND_PREFIX = "custom-notification";
const MAX_SOUND_BYTES = 10 * 1024 * 1024;

const AUDIO_MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".opus": "audio/opus",
  ".weba": "audio/webm",
  ".webm": "audio/webm",
};

const findCustomSound = (): string | null => {
  try {
    if (!fs.existsSync(SOUNDS_DIR)) return null;

    const file = fs
      .readdirSync(SOUNDS_DIR)
      .find((name) => name.startsWith(`${CUSTOM_SOUND_PREFIX}.`));

    return file ? path.join(SOUNDS_DIR, file) : null;
  } catch (error) {
    console.error("Failed to read the notification sounds folder:", error);
    return null;
  }
};

const clearCustomSounds = () => {
  try {
    if (!fs.existsSync(SOUNDS_DIR)) return;

    for (const name of fs.readdirSync(SOUNDS_DIR)) {
      if (name.startsWith(`${CUSTOM_SOUND_PREFIX}.`)) {
        fs.rmSync(path.join(SOUNDS_DIR, name), { force: true });
      }
    }
  } catch (error) {
    console.error("Failed to remove the notification sound:", error);
  }
};

ipcMain.handle("pick-notification-sound", async () => {
  const options: OpenDialogOptions = {
    title: locales[lang].sound.pick,
    properties: ["openFile"],
    filters: [
      {
        name: locales[lang].sound.filter,
        extensions: Object.keys(AUDIO_MIME).map((extension) =>
          extension.slice(1),
        ),
      },
    ],
  };

  const result = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options);

  if (result.canceled || result.filePaths.length === 0) return null;

  const source = result.filePaths[0];
  const extension = path.extname(source).toLowerCase();

  if (!AUDIO_MIME[extension]) {
    return { ok: false, error: "unsupported" };
  }

  try {
    const stats = await fs.promises.stat(source);

    if (stats.size > MAX_SOUND_BYTES) {
      return { ok: false, error: "too-large" };
    }

    await fs.promises.mkdir(SOUNDS_DIR, { recursive: true });
    clearCustomSounds();
    await fs.promises.copyFile(
      source,
      path.join(SOUNDS_DIR, `${CUSTOM_SOUND_PREFIX}${extension}`),
    );

    return { ok: true, name: path.basename(source) };
  } catch (error) {
    console.error("Failed to save the notification sound:", error);
    return { ok: false, error: "failed" };
  }
});

ipcMain.handle("get-notification-sound", async () => {
  const file = findCustomSound();
  if (!file) return null;

  try {
    const extension = path.extname(file).toLowerCase();
    const mime = AUDIO_MIME[extension] ?? "application/octet-stream";
    const data = await fs.promises.readFile(file);

    return {
      name: path.basename(file),
      mime,
      dataUrl: `data:${mime};base64,${data.toString("base64")}`,
    };
  } catch (error) {
    console.error("Failed to read the notification sound:", error);
    return null;
  }
});

ipcMain.handle("remove-notification-sound", () => {
  clearCustomSounds();
  return true;
});

interface DataToSolve {
  inputs: solveInputsState;
  requiredParts: requiredPart[];
  forbidden: requiredPart[];
  inventory?: Record<string, number>;
  inventoryEnabled?: boolean;
}

interface SolveResultPart {
  id: string;
  name: string;
  eng_name: string;
  count: number;
}

interface SolveResult {
  solution: SolveResultPart[];
  totalWeight: number;
  totalPower: number;
  totalDurability: number;
  totalParts: number;
}

export interface CalcParams {
  itemId: number;
  type: "b" | "s";
  mode: "optimal" | "allcraft" | "buyIng";
  overdrive: number[];
  onlyCraft: number[];
  is_own: boolean;
  own_rec?: Record<string, OwnRecipe>;
  no_rec?: number[];
}

let interval: NodeJS.Timeout | null = null;
let fetchedItems: IItem[];
let fetchedPrices: Record<string, IData>;
let lastCraft: CalcParams | null = null;
let lastUpdate: number;
let own_recipes: Record<string, OwnRecipe> = {};
let no_recipes: number[] = [];
let isMirror: boolean = false;

export const setIsMirror = (isMirr: boolean) => {
  if (isMirror === isMirr) return;

  isMirror = isMirr;
  win?.webContents.send("setMirror", isMirr);
};

export const getOwnRecipe = (id: number): OwnRecipe | undefined => {
  return own_recipes[id];
};

export const getNoRecipeMarked = (id: number) => no_recipes.includes(id);

const onUpdate = async () => {
  // checkUpdateStatus has a fast path for stale timestamps: it returns the
  // cached full price table instead of recomputing a diff. The mirror is slow,
  // so always ask from ten minutes in the past there.
  const requestTimestamp =
    isMirror && lastUpdate ? lastUpdate - 10 * 60 * 1000 : lastUpdate;

  const response = await fetchUpdate(requestTimestamp);
  if (!response || !response.updated) return;

  const { data, lastUpdateTimestamp } = response;

  lastUpdate = lastUpdateTimestamp;
  fetchedPrices = data.marketData;

  const analytics = getEnhancedAnalytics(fetchedItems, fetchedPrices);

  win?.webContents.send("update", { items: analytics });

  if (lastCraft) {
    const { itemId, type, overdrive, onlyCraft, mode, is_own } = lastCraft;
    const fnForItem = getOneItem(fetchedItems, fetchedPrices);

    const analyzed = fnForItem(itemId, type, {
      overdrive,
      onlyCraft,
      isCraftAll: mode === "allcraft",
      initialPriority: !is_own,
      ownPriority: is_own,
    });

    const chartData = await fetchChartData(itemId);
    const buildChartDataResult = buildChartData(
      chartData !== undefined ? chartData : [],
      "6m",
      lang,
    );

    win?.webContents.send("updateCraft", analyzed);
    win?.webContents.send("updateChart", buildChartDataResult);
  }
};

ipcMain.on("lang", (_, language) => {
  lang = language;
});

ipcMain.handle(
  "market",
  async (
    _,
    {
      own_rec,
      no_rec,
    }: { own_rec: Record<string, OwnRecipe>; no_rec: number[] },
  ) => {
    own_recipes = own_rec;
    no_recipes = no_rec;

    const data = await fetchItems();

    if (!data?.initialData?.items?.length) {
      throw new Error("Не удалось получить данные рынка");
    }

    const {
      initialData: { items, marketData, ...rest },
    } = data;
    const analytics = getEnhancedAnalytics(items, marketData);

    lastUpdate = rest.lastUpdateTimestamp;

    fetchedItems = items;
    fetchedPrices = marketData;

    if (interval !== null) {
      clearInterval(interval);
    }

    interval = setInterval(onUpdate, isMirror ? 1000 * 60 * 5 : 1000 * 30);

    return { ...rest, items: analytics };
  },
);

ipcMain.handle("marketCraft", async (_, params: CalcParams) => {
  const { itemId, type, overdrive, onlyCraft, mode, is_own, no_rec } = params;

  const { own_rec, ...rest } = params;
  lastCraft = rest;

  if (own_rec !== undefined) {
    own_recipes = own_rec;
  }

  if (no_rec !== undefined) {
    no_recipes = no_rec;
  }

  if (own_rec !== undefined || no_rec !== undefined) {
    const analytics = getEnhancedAnalytics(fetchedItems, fetchedPrices);
    win?.webContents.send("update", { items: analytics });
  }

  const fnForItem = getOneItem(fetchedItems, fetchedPrices);

  const analyzed = fnForItem(itemId, type, {
    overdrive,
    onlyCraft,
    isCraftAll: mode === "allcraft",
    initialPriority: !is_own,
    ownPriority: is_own,
  });

  return analyzed;
});

ipcMain.handle("fetchMarketChartData", async (_, id: number) => {
  const chartData = await fetchChartData(id);
  return buildChartData(chartData !== undefined ? chartData : [], "6m", lang);
});

ipcMain.handle(
  "solve",
  async (
    _,
    {
      inputs,
      requiredParts,
      forbidden,
      inventory = {},
      inventoryEnabled = false,
    }: DataToSolve,
  ) => {
    if (!fs.existsSync(exePath)) {
      throw new Error(
        `Solver not found at "${exePath}". Build it with "yarn solver:build".`,
      );
    }

    const forbiddenNames = forbidden.map((part) => part.eng_name);
    const parts = actualParts.filter(
      (p) => !forbiddenNames.includes(p.eng_name),
    );

    /* ---------------- helpers ---------------- */

    const partsById = new Map(parts.map((p) => [p.id, p]));

    const requiredStats = requiredParts.reduce(
      (acc, rp) => {
        const part = partsById.get(rp.id);
        if (!part) return acc;

        const durability =
          part.build_hp !== part.durability ? part.build_hp : part.durability;

        acc.parts += rp.count;
        acc.power += part.power * rp.count;
        acc.weight += part.weight * rp.count;
        acc.durability += durability * rp.count;

        return acc;
      },
      { parts: 0, power: 0, weight: 0, durability: 0 },
    );

    /* ---------------- limits ---------------- */

    const maxPS = inputs.maxPowerScores === 0 ? 999999 : inputs.maxPowerScores;

    const dataToSolve = {
      maxPower: maxPS - inputs.powerScores - requiredStats.power,
      maxWeight: inputs.tonnage - inputs.weight - requiredStats.weight - 1,
      maxParts: inputs.maxParts - inputs.parts - requiredStats.parts,
    };

    /* ---------------- prepare parts ---------------- */

    const partsPrepared = parts
      .map((p) => {
        const required = requiredParts.find((rp) => rp.id === p.id);
        const requiredCount = required?.count ?? 0;
        let maxCount = p.maxCount - requiredCount;

        // The warehouse is optional. When it is enabled, a part that is
        // explicitly present in the warehouse can only be used up to the
        // amount the user owns (minus the amount already reserved as required).
        if (
          inventoryEnabled &&
          Object.prototype.hasOwnProperty.call(inventory, p.id)
        ) {
          const owned = Math.max(0, (inventory[p.id] ?? 0) - requiredCount);
          maxCount = Math.min(maxCount, owned);
        }

        return {
          ...p,
          maxCount,
          durability: p.build_hp !== p.durability ? p.build_hp : p.durability,
        };
      })
      .filter(
        (p) =>
          (p.category === "Конструкции" || p.category === "Простреливаемые") &&
          p.durability >= inputs.minPartHp &&
          p.maxCount > 0,
      );

    const inputData = {
      ...dataToSolve,
      parts: partsPrepared,
    };

    /* ---------------- empty pool ---------------- */

    // The solver cannot handle an empty parts list, which happens when the
    // warehouse or the HP filter excludes every part. In that case the result
    // consists of the required parts only.
    if (partsPrepared.length === 0) {
      let totalDurability = requiredStats.durability;

      if (inputs.durabilityCabin) totalDurability *= 1.1;
      if (inputs.coDriver) totalDurability *= 1.05;
      totalDurability += inputs.durability;

      const requiredSolution = requiredParts
        .map((rp) => {
          const part = partsById.get(rp.id);
          if (!part) return null;

          return {
            id: rp.id,
            name: part.name,
            eng_name: part.eng_name,
            count: rp.count,
          };
        })
        .filter((part): part is SolveResultPart => part !== null);

      return {
        solution: requiredSolution,
        totalDurability: Math.round(totalDurability),
        totalWeight: inputs.weight + requiredStats.weight,
        totalPower: inputs.powerScores + requiredStats.power,
        totalParts: inputs.parts + requiredStats.parts,
      };
    }

    /* ---------------- run solver ---------------- */

    const proc = spawn(exePath);

    const result: SolveResult = await new Promise((resolve, reject) => {
      proc.on("error", reject);

      proc.stdin.write(JSON.stringify(inputData));
      proc.stdin.end();

      let stdout = "";

      proc.stdout.on("data", (d) => (stdout += d.toString()));
      proc.stderr.on("data", (e) => console.error(e.toString()));

      proc.on("close", () => {
        try {
          const parsed = JSON.parse(stdout);

          const solutionMap = new Map<
            string,
            { id: string; name: string; eng_name: string; count: number }
          >();

          // solver result
          for (const [id, count] of Object.entries(parsed.solution)) {
            const part = partsById.get(id);
            if (!part) continue;

            solutionMap.set(id, {
              id,
              name: part.name,
              eng_name: part.eng_name,
              count: Number(count),
            });
          }

          // add required parts
          for (const rp of requiredParts) {
            const part = partsById.get(rp.id);
            if (!part) continue;

            const existing = solutionMap.get(rp.id);
            if (existing) {
              existing.count += rp.count;
            } else {
              solutionMap.set(rp.id, {
                id: rp.id,
                name: part.name,
                eng_name: part.eng_name,
                count: rp.count,
              });
            }
          }

          /* ---------------- totals ---------------- */

          let totalDurability = parsed.maxDurability + requiredStats.durability;

          if (inputs.durabilityCabin) totalDurability *= 1.1;
          if (inputs.coDriver) totalDurability *= 1.05;
          totalDurability += inputs.durability;

          resolve({
            solution: Array.from(solutionMap.values()),
            totalDurability: Math.round(totalDurability),
            totalWeight:
              parsed.totalWeight + inputs.weight + requiredStats.weight,
            totalPower:
              parsed.totalPower + inputs.powerScores + requiredStats.power,
            totalParts: parsed.totalParts + inputs.parts + requiredStats.parts,
          });
        } catch (err) {
          reject(err);
        }
      });
    });

    return result;
  },
);

ipcMain.handle("getParts", async () => {
  return actualParts;
});

ipcMain.handle("search-required-parts", async (_, value) => {
  return actualParts.filter(
    (part) =>
      part.name.toLowerCase().includes(value.toLowerCase()) ||
      part.eng_name.toLowerCase().includes(value.toLowerCase()),
  );
});

let tray;

app.whenReady().then(async () => {
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon);
  tray.setToolTip(`XO Craft Solution v${app.getVersion()}`);

  tray.on("click", () => {
    win?.show();
  });

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Выход",
      click: () => {
        if (win) {
          const bounds = win.getBounds();
          const state: WindowState = { x: bounds.x, y: bounds.y };
          fs.writeFileSync(statePath, JSON.stringify(state));
        }
        app.quit();
        win = null;
      },
    },
  ]);
  tray.setContextMenu(contextMenu);

  actualParts = (
    await axios.get("https://nanosabo.github.io/xocs-imgs/actual_parts.json")
  ).data;

  createWindow();

  // Warm up the server action id cache in the background so the first market
  // update does not have to wait for chunk discovery.
  void getServerActionId("checkUpdateStatus");
});
