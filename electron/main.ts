import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  net,
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
import { applyDurabilityBonuses } from "./durabilityBonus";
import { matchesRequiredPartQuery, parsePartSearch } from "./partSearch";
import { requiredPart } from "@src/store/slices/requiredParts.slice";
import { fetchItems } from "./fetchItems";
import { isUsingMirror } from "./api";
import {
  contentLanguage,
  normalizeUiLanguage,
  type UiLanguage,
} from "./language";
import { IData, OwnRecipe } from "@src/store/slices/market.slice";
import { getEnhancedAnalytics, IItem } from "./craftItemsCalc";
import { getOneItem } from "./oneItemCalc";
import { fetchUpdate } from "./fetchUpdate";
import { buildChartData, fetchChartData } from "./fetchChartData";
import {
  getLogPath,
  getRecentLogs,
  installIpcErrorLogging,
  installMainLogging,
  setErrorNotifier,
  writeLog,
} from "./logger";
import {
  checkForUpdates,
  getUpdateState,
  installUpdate,
  readUpdateInfo,
  setupUpdater,
  startDownload,
} from "./updateManager";
import type { UpdateMode } from "@src/store/slices/updater.slice";
import type {
  CrossoutFetchBattlesParams,
  CrossoutLogHistoryInput,
  CrossoutStatsCacheInput,
  CrossoutUploadLogParams,
} from "@src/types/crossout";
import {
  clearCrossoutApiKey,
  fetchCrossoutBattles,
  getCrossoutApiKey,
  probeCrossoutHost,
  saveCrossoutApiKey,
  uploadCrossoutLog,
} from "./crossoutInfo";
import {
  getCrossoutNameCatalog,
  loadCrossoutLog,
  loadCrossoutLogTable,
} from "./crossoutLogApi";
import { closeCrossoutBrowser } from "./crossoutBrowser";
import {
  installWeaponScheme,
  registerWeaponProtocol,
} from "./weaponImages";
import {
  clearCrossoutHistory,
  listCrossoutHistory,
  removeCrossoutHistory,
  saveCrossoutHistory,
} from "./crossoutHistory";
import {
  clearCrossoutStatsCache,
  forgetCrossoutStatsCache,
  getCrossoutStatsCache,
  saveCrossoutStatsCache,
} from "./crossoutStatsCache";
import { findLatestCombatLog } from "./crossoutLogFind";
import { getLaunchAtLogin, setLaunchAtLogin } from "./launchAtLogin";
import {
  type AppLogLink,
  findAppLogLink,
  parseAppLogLink,
  APP_LOG_PROTOCOL,
} from "../src/helpers/appLogLink";
import locales from "./locales.json";
import axios from "axios";

installMainLogging();
installIpcErrorLogging();

app.setAppUserModelId("xo.craft.solution");

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
} else if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient(APP_LOG_PROTOCOL, process.execPath, [
    path.resolve(process.argv[1]),
  ]);
} else {
  app.setAsDefaultProtocolClient(APP_LOG_PROTOCOL);
}

let pendingAppLog: AppLogLink | null = findAppLogLink(process.argv);
let appLogListening = false;

const focusWindow = () => {
  if (!win || win.isDestroyed()) return;

  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
};

const queueAppLog = (link: AppLogLink | null) => {
  if (!link) return;

  pendingAppLog = link;
  focusWindow();

  if (appLogListening && win && !win.isDestroyed()) {
    win.webContents.send("app-open-log", pendingAppLog);
    pendingAppLog = null;
  }
};

app.on("second-instance", (_event, argv) => {
  queueAppLog(findAppLogLink(argv));
  focusWindow();
});

app.on("open-url", (event, url) => {
  event.preventDefault();
  queueAppLog(parseAppLogLink(url));
});

app.on("before-quit", () => {
  closeCrossoutBrowser();
});

let win: BrowserWindow | null;

setErrorNotifier((payload) => {
  if (win && !win.isDestroyed()) {
    win.webContents.send("app-error", payload);
  }
});

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
  size_x?: number;
  size_y?: number;
  size_z?: number;
}

let lang: UiLanguage = "ru";

const PARTS_URL = "https://nanosabo.github.io/xocs-imgs/actual_parts.json";
const partsCachePath = path.join(app.getPath("userData"), "actual_parts.json");

const isPartList = (value: unknown): value is Part[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(
    (part) =>
      part &&
      typeof part === "object" &&
      typeof (part as Part).id === "string" &&
      typeof (part as Part).name === "string",
  );

const readPartsCache = (): Part[] | null => {
  try {
    const parsed = JSON.parse(fs.readFileSync(partsCachePath, "utf8"));
    return isPartList(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writePartsCache = (parts: Part[]) => {
  try {
    fs.writeFileSync(partsCachePath, JSON.stringify(parts), "utf8");
  } catch {
    /* the cache is best-effort */
  }
};

const loadParts = async (): Promise<Part[]> => {
  if (!net.isOnline()) {
    const cached = readPartsCache();

    if (cached) {
      writeLog("warn", "parts", "Using cached parts while offline");
      return cached;
    }

    writeLog("error", "parts", "Failed to load parts", "No internet connection");
    return [];
  }

  try {
    const response = await axios.get(PARTS_URL, { timeout: 15000 });

    if (!isPartList(response.data)) {
      throw new Error("Сервер вернул пустой список деталей");
    }

    writePartsCache(response.data);
    return response.data;
  } catch (error) {
    const cached = readPartsCache();

    if (cached) {
      writeLog("warn", "parts", "Using cached parts after a network error", error);
      return cached;
    }

    writeLog("error", "parts", "Failed to load parts", error);
    return [];
  }
};

let partsRequest: Promise<Part[]> | null = null;

const catalogHasSizes = (parts: Part[]) =>
  parts.some((part) => typeof part.size_x === "number");

/** Loads the parts once; safe to call before the window is ready. */
const ensureParts = (): Promise<Part[]> => {
  if (!partsRequest) {
    partsRequest = loadParts().then((parts) => {
      // Allow a retry after a failed download, and after a catalog that was
      // saved before part sizes were published.
      if (parts.length === 0 || !catalogHasSizes(parts)) {
        partsRequest = null;
      }

      return parts;
    });
  }

  return partsRequest;
};

export const getLanguage = () => {
  return lang;
};

export const getContentLanguage = () => contentLanguage(lang);

const statePath = path.join(app.getPath("userData"), "window-state.json");

interface WindowState {
  x?: number;
  y?: number;
}

const RELEASE_REPO = "nanosabo/XO-Craft-Solution";

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

  win.webContents.on("render-process-gone", (_event, details) => {
    writeLog("error", "renderer", "Renderer process gone", details);
  });

  win.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL) => {
      writeLog("error", "renderer", "Failed to load renderer", {
        errorCode,
        errorDescription,
        validatedURL,
      });
    },
  );

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

  const logRoute = pendingAppLog
    ? `/logs/${encodeURIComponent(pendingAppLog.logId)}${
        pendingAppLog.type
          ? `?type=${encodeURIComponent(pendingAppLog.type)}`
          : ""
      }`
    : "";

  if (VITE_DEV_SERVER_URL) {
    const base = VITE_DEV_SERVER_URL.replace(/\/?$/, "/");
    win.loadURL(logRoute ? `${base}#${logRoute}` : VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(
      path.join(process.env.DIST, "index.html"),
      logRoute ? { hash: logRoute } : undefined,
    );
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

ipcMain.on("app-log-listening", (event) => {
  appLogListening = true;

  if (!pendingAppLog) return;

  event.sender.send("app-open-log", pendingAppLog);
  pendingAppLog = null;
  focusWindow();
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

ipcMain.handle("get-launch-at-login", () => getLaunchAtLogin());

ipcMain.handle("set-launch-at-login", (_, enabled: boolean) =>
  setLaunchAtLogin(enabled === true),
);

ipcMain.handle("get-error-logs", () => {
  return getRecentLogs();
});

ipcMain.handle("get-log-path", () => {
  return getLogPath();
});

ipcMain.handle("open-logs-folder", async () => {
  const file = getLogPath();

  if (!file) return false;

  const error = await shell.openPath(path.dirname(file));
  return !error;
});

ipcMain.handle("copy-text", (_, text: string) => {
  clipboard.writeText(String(text ?? ""));
  return true;
});

ipcMain.handle(
  "copy-table-image",
  async (_event, html: string, width: number, height: number) => {
    const shotWidth = Math.max(1, Math.ceil(width));
    const shotHeight = Math.min(16000, Math.max(1, Math.ceil(height)));
    const display = screen.getPrimaryDisplay().bounds;
    const win = new BrowserWindow({
      show: false,
      frame: false,
      x: display.x + display.width + 40,
      y: display.y,
      width: shotWidth,
      height: shotHeight + 32,
      useContentSize: true,
      enableLargerThanScreen: true,
      focusable: false,
      skipTaskbar: true,
      backgroundColor: "#111316",
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    try {
      await win.loadURL("about:blank");
      await win.webContents.executeJavaScript(
        `document.open(); document.write(${JSON.stringify(html)}); document.close(); true;`,
      );
      await win.webContents.executeJavaScript(`
        (async () => {
          const imageDone = Promise.all(Array.from(document.images).map((img) => (
            img.complete
              ? Promise.resolve()
              : new Promise((resolve) => {
                  img.addEventListener("load", () => resolve(), { once: true });
                  img.addEventListener("error", () => resolve(), { once: true });
                })
          )));
          await Promise.race([
            Promise.all([document.fonts.ready, imageDone]),
            new Promise((resolve) => setTimeout(resolve, 4000)),
          ]);
          await new Promise((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          });
        })()
      `);

      const readBounds = `(function () {
        const table = document.querySelector("table");
        const node = table && table.parentElement ? table.parentElement : table;
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom };
      })()`;

      let bounds = await win.webContents.executeJavaScript(readBounds);

      if (bounds) {
        const needWidth = Math.ceil(bounds.right);
        const needHeight = Math.ceil(bounds.bottom);
        const [contentWidth, contentHeight] = win.getContentSize();

        if (contentWidth < needWidth || contentHeight < needHeight) {
          win.setContentSize(
            Math.max(contentWidth, needWidth),
            Math.max(contentHeight, needHeight),
          );
          await win.webContents.executeJavaScript(`new Promise((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          })`);
          bounds = await win.webContents.executeJavaScript(readBounds);
        }
      }

      let image = await win.webContents.capturePage();

      if (image.isEmpty()) {
        win.showInactive();
        image = await win.webContents.capturePage();
      }

      if (image.isEmpty()) return false;

      if (bounds) {
        const { width: imageWidth, height: imageHeight } = image.getSize();
        const [contentWidth, contentHeight] = win.getContentSize();
        const scaleX = contentWidth > 0 ? imageWidth / contentWidth : 1;
        const scaleY = contentHeight > 0 ? imageHeight / contentHeight : 1;
        const cropX = Math.max(0, Math.floor(bounds.x * scaleX));
        const cropY = Math.max(0, Math.floor(bounds.y * scaleY));
        const cropRight = Math.min(imageWidth, Math.ceil(bounds.right * scaleX));
        const cropBottom = Math.min(
          imageHeight,
          Math.ceil(bounds.bottom * scaleY),
        );

        if (cropRight > cropX && cropBottom > cropY) {
          image = image.crop({
            x: cropX,
            y: cropY,
            width: cropRight - cropX,
            height: cropBottom - cropY,
          });
        }
      }

      clipboard.writeImage(image);
      return true;
    } finally {
      if (!win.isDestroyed()) win.destroy();
    }
  },
);

ipcMain.handle("crossout-has-api-key", () => {
  return getCrossoutApiKey() !== null;
});

ipcMain.handle("crossout-set-api-key", (_, apiKey: string) => {
  return saveCrossoutApiKey(String(apiKey ?? ""));
});

ipcMain.handle("crossout-clear-api-key", () => {
  return clearCrossoutApiKey();
});

ipcMain.handle(
  "crossout-fetch-battles",
  (_, params: CrossoutFetchBattlesParams) => {
    return fetchCrossoutBattles(params, getContentLanguage());
  },
);

ipcMain.handle(
  "crossout-upload-log",
  (event, params: CrossoutUploadLogParams) => {
    return uploadCrossoutLog(params, getContentLanguage(), (progress) => {
      if (event.sender.isDestroyed()) return;

      event.sender.send("crossout-upload-progress", progress);
    });
  },
);

ipcMain.handle("crossout-load-log", (_, logId: string) => {
  return loadCrossoutLog(String(logId ?? ""), getContentLanguage());
});

ipcMain.handle("crossout-names", () => getCrossoutNameCatalog());

ipcMain.handle(
  "crossout-load-log-table",
  (
    _,
    logId: string,
    type: string,
    expectedBattles?: number,
    range?: { from?: number; to?: number } | null,
  ) => {
    const from = Number(range?.from);
    const to = Number(range?.to);

    return loadCrossoutLogTable(
      String(logId ?? ""),
      String(type ?? ""),
      getContentLanguage(),
      Number(expectedBattles) || 0,
      Number.isFinite(from) && Number.isFinite(to)
        ? { from, to }
        : null,
    );
  },
);

ipcMain.handle("crossout-history-list", () => {
  return listCrossoutHistory();
});

ipcMain.handle(
  "crossout-history-save",
  (_, entry: CrossoutLogHistoryInput) => {
    return saveCrossoutHistory(entry);
  },
);

ipcMain.handle("crossout-history-remove", (_, logId: string) => {
  const id = String(logId ?? "");

  forgetCrossoutStatsCache(id);

  return removeCrossoutHistory(id);
});

ipcMain.handle("crossout-history-clear", () => {
  clearCrossoutStatsCache();

  return clearCrossoutHistory();
});

ipcMain.handle("crossout-stats-cache-get", (_, logId: string) => {
  return getCrossoutStatsCache(String(logId ?? ""), getContentLanguage());
});

ipcMain.handle(
  "crossout-stats-cache-save",
  (_, input: CrossoutStatsCacheInput) => {
    saveCrossoutStatsCache(input, getContentLanguage());
  },
);

ipcMain.handle("crossout-find-latest-log", (_, customPath?: string) => {
  return findLatestCombatLog({
    home: app.getPath("home"),
    documents: app.getPath("documents"),
    localAppData: process.env.LOCALAPPDATA,
    winePrefix: process.env.WINEPREFIX,
    customLogsPath: typeof customPath === "string" ? customPath : null,
  });
});

ipcMain.handle("crossout-pick-logs-folder", async () => {
  const options: OpenDialogOptions = {
    title: locales[lang].crossout.logs,
    properties: ["openDirectory"],
  };

  const result = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options);

  if (result.canceled || result.filePaths.length === 0) return null;

  return result.filePaths[0];
});

ipcMain.handle("crossout-pick-log", async () => {
  const options: OpenDialogOptions = {
    title: locales[lang].crossout.pick,
    properties: ["openFile"],
    filters: [
      {
        name: locales[lang].crossout.filter,
        extensions: ["log", "txt"],
      },
      {
        name: locales[lang].crossout.all,
        extensions: ["*"],
      },
    ],
  };

  const result = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options);

  if (result.canceled || result.filePaths.length === 0) return null;

  return result.filePaths[0];
});

ipcMain.on(
  "log:write",
  (
    _,
    entry: {
      level?: "info" | "warn" | "error";
      scope?: string;
      message?: string;
      details?: unknown;
    },
  ) => {
    writeLog(
      entry?.level === "info" || entry?.level === "warn" ? entry.level : "error",
      entry?.scope || "renderer",
      entry?.message || "Unknown renderer error",
      entry?.details,
    );
  },
);

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

ipcMain.handle(
  "check-for-updates",
  (_, payload?: { automatic?: boolean }) => {
    return checkForUpdates(Boolean(payload?.automatic));
  },
);

ipcMain.handle("get-update-state", () => {
  return getUpdateState();
});

ipcMain.handle("download-update", (_, mode: UpdateMode) => {
  return startDownload(mode === "later" ? "later" : "now");
});

ipcMain.handle("install-update", () => {
  return installUpdate();
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
  /** Parts whose count is fixed. The solver must not add any more of them. */
  lockedPartIds?: string[];
  /** Parts the user never wants suggested. Applied even without other filters. */
  excludedPartIds?: string[];
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
  /** Durability of the same budget with no required, forbidden or locked parts. */
  openDurability?: number;
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
  lang = normalizeUiLanguage(String(language ?? ""));
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
    writeLog("info", "market", "Market request started");
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

    writeLog("info", "market", "Market request finished", {
      items: analytics.length,
      mirror: isMirror,
    });

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

const runSolve = async ({
  inputs,
  requiredParts,
  forbidden,
  inventory = {},
  inventoryEnabled = false,
  lockedPartIds = [],
  excludedPartIds = [],
}: DataToSolve): Promise<SolveResult> => {
    if (!fs.existsSync(exePath)) {
      throw new Error(
        `Solver not found at "${exePath}". Build it with "yarn solver:build".`,
      );
    }

    const loadedParts = await ensureParts();

    if (loadedParts.length === 0) {
      throw new Error(
        "Не удалось загрузить список деталей. Проверьте подключение к интернету.",
      );
    }

    const forbiddenNames = forbidden.map((part) => part.eng_name);
    const excludedIds = new Set(excludedPartIds);
    const parts = loadedParts.filter(
      (p) => !excludedIds.has(p.id) && !forbiddenNames.includes(p.eng_name),
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
    const lockedIds = new Set(lockedPartIds);

    const dataToSolve = {
      maxPower: Math.max(0, maxPS - inputs.powerScores - requiredStats.power),
      maxWeight: Math.max(
        0,
        inputs.tonnage - inputs.weight - requiredStats.weight - 1,
      ),
      maxParts: Math.max(0, inputs.maxParts - inputs.parts - requiredStats.parts),
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

        if (lockedIds.has(p.id)) maxCount = 0;

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
      let totalDurability = applyDurabilityBonuses(
        requiredStats.durability,
        inputs,
      );
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

          let totalDurability = applyDurabilityBonuses(
            parsed.maxDurability + requiredStats.durability,
            inputs,
          );
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
};

ipcMain.handle("solve", async (_, data: DataToSolve) => {
  const result = await runSolve(data);
  const constrained =
    data.requiredParts.length > 0 ||
    data.forbidden.length > 0 ||
    (data.lockedPartIds?.length ?? 0) > 0;

  if (!constrained) return result;

  try {
    const open = await runSolve({
      ...data,
      requiredParts: [],
      forbidden: [],
      lockedPartIds: [],
    });

    return { ...result, openDurability: open.totalDurability };
  } catch (error) {
    console.error("Unconstrained durability solve failed:", error);
    return result;
  }
});

ipcMain.handle("getParts", async () => {
  return ensureParts();
});

ipcMain.handle("search-required-parts", async (_, value) => {
  let parts = await ensureParts();
  const query = String(value ?? "");

  if (parsePartSearch(query).sizes && !catalogHasSizes(parts)) {
    partsRequest = null;
    parts = await ensureParts();
  }

  return parts.filter((part) => matchesRequiredPartQuery(part, query));
});

let tray;

installWeaponScheme();

app.whenReady().then(async () => {
  registerWeaponProtocol();

  writeLog("info", "app", "Application started", {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron,
    isDev: IS_DEV,
    mirror: isUsingMirror(),
  });

  setupUpdater({
    getWindow: () => win,
    getLanguage: () => lang,
    notify: (title, body) => {
      if (!Notification.isSupported()) return;

      new Notification({
        title,
        body,
        icon: nativeImage.createFromPath(iconPath),
      }).show();
    },
  });

  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon);
  tray.setToolTip(`XO Craft Solution v${app.getVersion()}`);

  tray.on("click", () => {
    if (!win || win.isDestroyed()) {
      createWindow();
      return;
    }

    win.show();
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

  // Never block the window on network access: without a connection the app
  // must still open and show the error/report screen.
  void ensureParts();
  void probeCrossoutHost();
  createWindow();
});
