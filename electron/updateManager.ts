import { app } from "electron";
import type { BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";
import { autoUpdater } from "electron-updater";
import type { ProgressInfo, UpdateInfo } from "electron-updater";
import type {
  UpdateMode,
  UpdateProgress,
  UpdateState,
} from "@src/store/slices/updater.slice";
import locales from "./locales.json";
import { writeLog } from "./logger";

export interface StoredUpdateInfo {
  version: string;
  releaseNotes: string | null;
}

export interface UpdateCheckResult {
  ok: boolean;
  current: string;
  latest: string | null;
  message?: string;
}

export interface UpdateActionResult {
  ok: boolean;
  message?: string;
}

interface UpdaterOptions {
  getWindow: () => BrowserWindow | null;
  getLanguage: () => "ru" | "en";
  notify: (title: string, body: string) => void;
}

const updateInfoPath = path.join(app.getPath("userData"), "update-info.json");

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

export const readUpdateInfo = (): StoredUpdateInfo | null => {
  try {
    return JSON.parse(fs.readFileSync(updateInfoPath, "utf8"));
  } catch {
    return null;
  }
};

const releaseNotesFrom = (info: UpdateInfo): string | null => {
  const notes = info.releaseNotes;

  if (Array.isArray(notes)) {
    return (
      notes
        .map((note) => note.note ?? "")
        .filter(Boolean)
        .join("\n\n") || null
    );
  }

  return typeof notes === "string" ? notes : null;
};

let options: UpdaterOptions | null = null;
let initialized = false;
let downloadInFlight = false;

let state: UpdateState = {
  stage: "idle",
  currentVersion: app.getVersion(),
  latestVersion: null,
  releaseNotes: null,
  releaseDate: null,
  progress: null,
  mode: null,
  error: null,
  automatic: false,
  checkedAt: null,
};

const emit = () => {
  const win = options?.getWindow();

  if (win && !win.isDestroyed()) {
    win.webContents.send("update-state", state);
  }
};

const setState = (patch: Partial<UpdateState>) => {
  state = { ...state, ...patch, currentVersion: app.getVersion() };
  emit();
  return state;
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const logUpdateError = (message: string, error: unknown) => {
  writeLog("error", "update", message, {
    error: errorMessage(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
};

const notifyWhenHidden = () => {
  const win = options?.getWindow();

  if (win && !win.isDestroyed() && win.isVisible() && !win.isMinimized()) {
    return;
  }

  const lang = options?.getLanguage() ?? "ru";
  options?.notify(locales[lang].update.title, locales[lang].update.body);
};

export const setupUpdater = (nextOptions: UpdaterOptions) => {
  options = nextOptions;

  if (initialized) return;

  initialized = true;

  // Downloads must only start after the user picks an option in the in-app
  // notification. Installing on quit keeps "update on next launch" working.
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = true;

  writeLog("info", "update", "Updater initialized", {
    version: app.getVersion(),
  });

  autoUpdater.on("checking-for-update", () => {
    setState({
      stage: "checking",
      error: null,
      progress: null,
      checkedAt: Date.now(),
    });
  });

  autoUpdater.on("update-available", (info) => {
    const releaseNotes = releaseNotesFrom(info);

    writeLog("info", "update", "Update available", {
      current: app.getVersion(),
      latest: info.version,
    });
    saveUpdateInfo({ version: info.version, releaseNotes });

    setState({
      stage: "available",
      latestVersion: info.version,
      releaseNotes,
      releaseDate: info.releaseDate ?? null,
      progress: null,
      mode: null,
      error: null,
      checkedAt: Date.now(),
    });
  });

  autoUpdater.on("update-not-available", () => {
    setState({
      stage: "up-to-date",
      latestVersion: null,
      releaseNotes: null,
      releaseDate: null,
      progress: null,
      mode: null,
      error: null,
      checkedAt: Date.now(),
    });
  });

  autoUpdater.on("download-progress", (info: ProgressInfo) => {
    const progress: UpdateProgress = {
      percent: Math.min(100, Math.max(0, info.percent)),
      transferred: info.transferred,
      total: info.total,
      bytesPerSecond: info.bytesPerSecond,
    };

    setState({ stage: "downloading", progress, error: null });
  });

  autoUpdater.on("update-downloaded", (info) => {
    writeLog("info", "update", "Update downloaded", {
      version: info.version,
    });

    setState({
      stage: "downloaded",
      latestVersion: info.version,
      progress: null,
      error: null,
      checkedAt: Date.now(),
    });

    notifyWhenHidden();
  });

  autoUpdater.on("update-cancelled", (info) => {
    writeLog("warn", "update", "Update download cancelled", {
      version: info.version,
    });

    setState({ stage: "available", progress: null });
  });

  autoUpdater.on("error", (error) => {
    logUpdateError("Updater error", error);
    setState({ stage: "error", error: errorMessage(error), progress: null });
  });
};

export const getUpdateState = (): UpdateState => {
  return { ...state, currentVersion: app.getVersion() };
};

export const checkForUpdates = async (
  automatic = false,
): Promise<UpdateCheckResult> => {
  if (state.stage === "downloading" || state.stage === "downloaded") {
    return {
      ok: true,
      current: app.getVersion(),
      latest: state.latestVersion,
    };
  }

  setState({
    automatic,
    stage: "checking",
    error: null,
    progress: null,
    checkedAt: Date.now(),
  });

  try {
    const result = await autoUpdater.checkForUpdates();
    const info = result?.updateInfo;

    return {
      ok: true,
      current: app.getVersion(),
      latest: info?.version ?? state.latestVersion,
    };
  } catch (error) {
    const message = errorMessage(error);
    logUpdateError("Update check failed", error);
    setState({ stage: "error", error: message, progress: null });

    return {
      ok: false,
      current: app.getVersion(),
      latest: state.latestVersion,
      message,
    };
  }
};

export const startDownload = async (
  mode: UpdateMode,
): Promise<UpdateActionResult> => {
  writeLog("info", "update", "Update download requested", { mode });
  setState({ mode });

  if (state.stage === "downloaded" || state.stage === "downloading") {
    return { ok: true };
  }

  if (state.stage !== "available") {
    const check = await checkForUpdates(false);

    if (!check.ok) {
      return { ok: false, message: check.message };
    }

    if (getUpdateState().stage !== "available") {
      return { ok: true };
    }

    // The check events reset the mode, so restore the user's choice before
    // starting the download.
    setState({ mode });
  }

  if (downloadInFlight) {
    return { ok: true };
  }

  downloadInFlight = true;

  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (error) {
    const message = errorMessage(error);
    logUpdateError("Update download failed", error);
    setState({ stage: "error", error: message, progress: null });

    return { ok: false, message };
  } finally {
    downloadInFlight = false;
  }
};

export const installUpdate = (): boolean => {
  if (state.stage !== "downloaded") return false;

  writeLog("info", "update", "Installing update", {
    version: state.latestVersion,
  });
  setState({ mode: "now" });

  // Let the renderer receive the final state before the window is closed.
  setImmediate(() => {
    autoUpdater.quitAndInstall(false, true);
  });

  return true;
};
