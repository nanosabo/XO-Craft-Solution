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
    checkForUpdates(automatic?: boolean): Promise<{
      ok: boolean;
      current: string;
      latest: string | null;
      message?: string;
    }>;
    getUpdateState(): Promise<
      import("@src/store/slices/updater.slice").UpdateState
    >;
    downloadUpdate(
      mode: import("@src/store/slices/updater.slice").UpdateMode,
    ): Promise<{ ok: boolean; message?: string }>;
    installUpdate(): Promise<boolean>;
    onUpdateState(
      listener: (
        state: import("@src/store/slices/updater.slice").UpdateState,
      ) => void,
    ): () => void;
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
    copyTableImage(html: string, width: number, height: number): Promise<boolean>;
    crossoutHasApiKey(): Promise<boolean>;
    crossoutSetApiKey(apiKey: string): Promise<boolean>;
    crossoutClearApiKey(): Promise<boolean>;
    crossoutFetchBattles(
      params: import("@src/types/crossout").CrossoutFetchBattlesParams,
    ): Promise<import("@src/types/crossout").CrossoutBattlesResult>;
    crossoutUploadLog(
      params: import("@src/types/crossout").CrossoutUploadLogParams,
    ): Promise<import("@src/types/crossout").CrossoutUploadLogResult>;
    onCrossoutUploadProgress(
      listener: (
        progress: import("@src/types/crossout").CrossoutUploadProgress,
      ) => void,
    ): () => void;
    crossoutLoadLog(
      logId: string,
    ): Promise<import("@src/types/crossout").CrossoutLogSummaryResult>;
    crossoutNames(): Promise<import("@src/types/crossout").CrossoutNameCatalog>;
    crossoutLoadLogTable(
      logId: string,
      type: string,
      expectedBattles?: number,
      range?: { from: number; to: number } | null,
    ): Promise<import("@src/types/crossout").CrossoutLogTableResult>;
    crossoutHistoryList(): Promise<
      import("@src/types/crossout").CrossoutLogHistoryEntry[]
    >;
    crossoutHistorySave(
      entry: import("@src/types/crossout").CrossoutLogHistoryInput,
    ): Promise<import("@src/types/crossout").CrossoutLogHistoryEntry[]>;
    crossoutHistoryRemove(
      logId: string,
    ): Promise<import("@src/types/crossout").CrossoutLogHistoryEntry[]>;
    crossoutHistoryClear(): Promise<
      import("@src/types/crossout").CrossoutLogHistoryEntry[]
    >;
    crossoutStatsCacheGet(
      logId: string,
    ): Promise<import("@src/types/crossout").CrossoutCachedLogStats | null>;
    crossoutStatsCacheSave(
      input: import("@src/types/crossout").CrossoutStatsCacheInput,
    ): Promise<void>;
    crossoutPickLog(): Promise<string | null>;
    crossoutFindLatestLog(
      customPath?: string | null,
    ): Promise<import("@src/types/crossout").CrossoutDetectedLog | null>;
    crossoutPickLogsFolder(): Promise<string | null>;
    notifyAppLogListening(): void;
    onAppOpenLog(
      listener: (link: import("@src/helpers/appLogLink").AppLogLink) => void,
    ): () => void;
  };
}
