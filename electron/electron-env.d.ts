/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    DIST: string;
    /** /dist/ or /public/ */
    VITE_PUBLIC: string;
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: import("electron").IpcRenderer;
  electronAPI: {
    getVersion(): Promise<string>;
    getIsMirror(): Promise<boolean>;
    getUpdateInfo(): Promise<{
      version: string;
      releaseNotes: string | null;
    } | null>;
    getReleaseFeed(): Promise<string | null>;
    checkForUpdates(): Promise<{
      ok: boolean;
      current: string;
      latest: string | null;
      message?: string;
    }>;
    showNotification(payload: {
      title: string;
      body: string;
      icon?: string;
    }): Promise<boolean>;
    openExternal(url: string): Promise<boolean>;
    openUserData(): Promise<boolean>;
    pickNotificationSound(): Promise<
      | { ok: true; name: string }
      | { ok: false; error: "too-large" | "unsupported" | "failed" }
      | null
    >;
    getNotificationSound(): Promise<{
      name: string;
      mime: string;
      dataUrl: string;
    } | null>;
    removeNotificationSound(): Promise<boolean>;
    logError(entry: {
      level?: "info" | "warn" | "error";
      scope?: string;
      message?: string;
      details?: unknown;
    }): void;
    getErrorLogs(): Promise<string>;
    getLogPath(): Promise<string | null>;
    openLogsFolder(): Promise<boolean>;
    copyText(text: string): Promise<boolean>;
  };
}
