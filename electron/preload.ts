/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { contextBridge, ipcRenderer } from "electron";
import type {
  UpdateMode,
  UpdateState,
} from "@src/store/slices/updater.slice";
import type { AppLogLink } from "@src/helpers/appLogLink";
import type {
  CrossoutDetectedLog,
  CrossoutFetchBattlesParams,
  CrossoutStatsCacheInput,
  CrossoutUploadLogParams,
  CrossoutUploadProgress,
} from "@src/types/crossout";

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("ipcRenderer", withPrototype(ipcRenderer));

contextBridge.exposeInMainWorld("electronAPI", {
  getVersion: () => ipcRenderer.invoke("get-app-version"),
  getIsMirror: () => ipcRenderer.invoke("get-is-mirror"),
  getUpdateInfo: () => ipcRenderer.invoke("get-update-info"),
  getReleaseFeed: () => ipcRenderer.invoke("get-release-feed"),
  checkForUpdates: (automatic?: boolean) =>
    ipcRenderer.invoke("check-for-updates", { automatic: Boolean(automatic) }),
  getUpdateState: () => ipcRenderer.invoke("get-update-state"),
  downloadUpdate: (mode: UpdateMode) =>
    ipcRenderer.invoke("download-update", mode),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  onUpdateState: (listener: (state: UpdateState) => void) => {
    const wrapped = (_: Electron.IpcRendererEvent, state: UpdateState) => {
      listener(state);
    };

    ipcRenderer.on("update-state", wrapped);

    return () => ipcRenderer.removeListener("update-state", wrapped);
  },
  showNotification: (payload: {
    title: string;
    body: string;
    icon?: string;
  }) => ipcRenderer.invoke("show-notification", payload),
  openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
  openUserData: () => ipcRenderer.invoke("open-user-data"),
  pickNotificationSound: () => ipcRenderer.invoke("pick-notification-sound"),
  getNotificationSound: () => ipcRenderer.invoke("get-notification-sound"),
  removeNotificationSound: () => ipcRenderer.invoke("remove-notification-sound"),
  logError: (entry: {
    level?: "info" | "warn" | "error";
    scope?: string;
    message?: string;
    details?: unknown;
  }) => ipcRenderer.send("log:write", entry),
  getErrorLogs: () => ipcRenderer.invoke("get-error-logs"),
  getLogPath: () => ipcRenderer.invoke("get-log-path"),
  openLogsFolder: () => ipcRenderer.invoke("open-logs-folder"),
  copyText: (text: string) => ipcRenderer.invoke("copy-text", text),
  copyTableImage: (html: string, width: number, height: number) =>
    ipcRenderer.invoke("copy-table-image", html, width, height),
  crossoutHasApiKey: () => ipcRenderer.invoke("crossout-has-api-key"),
  crossoutSetApiKey: (apiKey: string) =>
    ipcRenderer.invoke("crossout-set-api-key", apiKey),
  crossoutClearApiKey: () => ipcRenderer.invoke("crossout-clear-api-key"),
  crossoutFetchBattles: (params: CrossoutFetchBattlesParams) =>
    ipcRenderer.invoke("crossout-fetch-battles", params),
  crossoutUploadLog: (params: CrossoutUploadLogParams) =>
    ipcRenderer.invoke("crossout-upload-log", params),
  onCrossoutUploadProgress: (
    listener: (progress: CrossoutUploadProgress) => void,
  ) => {
    const wrapped = (
      _: Electron.IpcRendererEvent,
      progress: CrossoutUploadProgress,
    ) => {
      listener(progress);
    };

    ipcRenderer.on("crossout-upload-progress", wrapped);

    return () =>
      ipcRenderer.removeListener("crossout-upload-progress", wrapped);
  },
  crossoutLoadLog: (logId: string) =>
    ipcRenderer.invoke("crossout-load-log", logId),
  crossoutLoadLogTable: (
    logId: string,
    type: string,
    expectedBattles?: number,
    range?: { from: number; to: number } | null,
  ) =>
    ipcRenderer.invoke(
      "crossout-load-log-table",
      logId,
      type,
      expectedBattles,
      range ?? null,
    ),
  crossoutHistoryList: () => ipcRenderer.invoke("crossout-history-list"),
  crossoutHistorySave: (
    entry: import("@src/types/crossout").CrossoutLogHistoryInput,
  ) => ipcRenderer.invoke("crossout-history-save", entry),
  crossoutHistoryRemove: (logId: string) =>
    ipcRenderer.invoke("crossout-history-remove", logId),
  crossoutHistoryClear: () => ipcRenderer.invoke("crossout-history-clear"),
  crossoutStatsCacheGet: (logId: string) =>
    ipcRenderer.invoke("crossout-stats-cache-get", logId),
  crossoutStatsCacheSave: (input: CrossoutStatsCacheInput) =>
    ipcRenderer.invoke("crossout-stats-cache-save", input),
  crossoutPickLog: () => ipcRenderer.invoke("crossout-pick-log"),
  crossoutFindLatestLog: (customPath?: string | null) =>
    ipcRenderer.invoke(
      "crossout-find-latest-log",
      customPath ?? null,
    ) as Promise<CrossoutDetectedLog | null>,
  crossoutPickLogsFolder: () =>
    ipcRenderer.invoke("crossout-pick-logs-folder") as Promise<string | null>,
  notifyAppLogListening: () => ipcRenderer.send("app-log-listening"),
  onAppOpenLog: (listener: (link: AppLogLink) => void) => {
    const wrapped = (_: Electron.IpcRendererEvent, link: AppLogLink) => {
      listener(link);
    };

    ipcRenderer.on("app-open-log", wrapped);

    return () => ipcRenderer.removeListener("app-open-log", wrapped);
  },
});

// `exposeInMainWorld` can't detect attributes and methods of `prototype`, manually patching it.
function withPrototype(obj: Record<string, any>) {
  const protos = Object.getPrototypeOf(obj);

  for (const [key, value] of Object.entries(protos)) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) continue;

    if (typeof value === "function") {
      // Some native APIs, like `NodeJS.EventEmitter['on']`, don't work in the Renderer process. Wrapping them into a function.
      obj[key] = function (...args: any) {
        return value.call(obj, ...args);
      };
    } else {
      obj[key] = value;
    }
  }
  return obj;
}

// --------- Preload scripts loading ---------
function domReady(
  condition: DocumentReadyState[] = ["complete", "interactive"],
) {
  return new Promise((resolve) => {
    if (condition.includes(document.readyState)) {
      resolve(true);
    } else {
      document.addEventListener("readystatechange", () => {
        if (condition.includes(document.readyState)) {
          resolve(true);
        }
      });
    }
  });
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find((e) => e === child)) {
      parent.appendChild(child);
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find((e) => e === child)) {
      parent.removeChild(child);
    }
  },
};

/**
 * https://tobiasahlin.com/spinkit
 * https://connoratherton.com/loaders
 * https://projects.lukehaas.me/css-loaders
 * https://matejkustec.github.io/SpinThatShit
 */
function useLoading() {
  const className = `loaders-css__spin`;
  const styleContent = `
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity:1; }
}

.${className} > div {
  animation-fill-mode: both;
  width: 100px;
  height: 100px;
  background: url("./preloader.svg");
  background-repeat: no-repeat;
  background-size: cover;
  animation: spin 2s linear infinite;
  
  transition: opacity 0.1s ease-in-out;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #111316;
  background-image: url("./bg.svg");
  z-index: 9;

  animation: fade-in 0.2s ease-in;
}

.app-loading-wrap.fade-out .${className} > div {
  opacity: 0;
}
    `;
  const oStyle = document.createElement("style");
  const oDiv = document.createElement("div");

  oStyle.id = "app-loading-style";
  oStyle.innerHTML = styleContent;
  oDiv.className = "app-loading-wrap";
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`;

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle);
      safeDOM.append(document.body, oDiv);
    },
    removeLoading() {
      oDiv.classList.add("fade-out");
      setTimeout(() => {
        safeDOM.remove(document.head, oStyle);
        safeDOM.remove(document.body, oDiv);
      }, 100);
    },
  };
}

// ----------------------------------------------------------------------

const { appendLoading, removeLoading } = useLoading();
domReady().then(appendLoading);

window.onmessage = (ev) => {
  ev.data.payload === "removeLoading" && removeLoading();
};

setTimeout(removeLoading, 4999);
