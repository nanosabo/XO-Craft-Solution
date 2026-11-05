import { app, ipcMain } from "electron";
import fs from "node:fs";
import path from "node:path";

export type LogLevel = "info" | "warn" | "error";

export interface ErrorPayload {
  scope: string;
  message: string;
  stack?: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

const LOG_FILE_NAME = "app.log";
const MAX_LOG_BYTES = 1024 * 1024;
const MAX_MEMORY_LINES = 500;
const MAX_DETAILS_LENGTH = 8000;

const memory: string[] = [];

let logFilePath: string | null = null;
let loggingInstalled = false;
let ipcLoggingInstalled = false;
let errorNotifier: ((payload: ErrorPayload) => void) | null = null;

const stringify = (value: unknown): string => {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ""}`;
  }

  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const truncate = (value: string, limit = MAX_DETAILS_LENGTH): string =>
  value.length > limit ? `${value.slice(0, limit)}… [truncated]` : value;

const getLogFilePath = (): string | null => {
  if (logFilePath) return logFilePath;

  try {
    logFilePath = path.join(app.getPath("userData"), "logs", LOG_FILE_NAME);
    return logFilePath;
  } catch {
    return null;
  }
};

export const getLogPath = getLogFilePath;

const appendToFile = (line: string) => {
  const file = getLogFilePath();
  if (!file) return;

  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });

    try {
      const stat = fs.statSync(file);

      if (stat.size > MAX_LOG_BYTES) {
        const previous = file.replace(/\.log$/, ".old.log");

        // Windows does not allow renaming over an existing file.
        fs.rmSync(previous, { force: true });
        fs.renameSync(file, previous);
      }
    } catch {
      /* the log file does not exist yet */
    }

    fs.appendFileSync(file, `${line}\n`, "utf8");
  } catch {
    /* logging must never break the app */
  }
};

export const writeLog = (
  level: LogLevel,
  scope: string,
  message: string,
  details?: unknown,
): string => {
  const timestamp = new Date().toISOString();
  const detailsText =
    details === undefined ? "" : ` | ${truncate(stringify(details))}`;
  const line = `[${timestamp}] [${level.toUpperCase()}] [${scope}] ${truncate(
    message,
    2000,
  )}${detailsText}`;

  memory.push(line);

  if (memory.length > MAX_MEMORY_LINES) {
    memory.shift();
  }

  appendToFile(line);

  return line;
};

export const getRecentLogs = (): string => {
  const file = getLogFilePath();

  if (file) {
    try {
      const stat = fs.statSync(file);
      const start = Math.max(0, stat.size - MAX_LOG_BYTES);
      const length = stat.size - start;

      if (length > 0) {
        const buffer = Buffer.alloc(length);
        const descriptor = fs.openSync(file, "r");

        try {
          fs.readSync(descriptor, buffer, 0, length, start);
        } finally {
          fs.closeSync(descriptor);
        }

        return buffer.toString("utf8");
      }
    } catch {
      /* fall back to the in-memory log */
    }
  }

  return memory.join("\n");
};

export const setErrorNotifier = (
  notifier: ((payload: ErrorPayload) => void) | null,
) => {
  errorNotifier = notifier;
};

const notifyError = (payload: ErrorPayload) => {
  try {
    errorNotifier?.(payload);
  } catch {
    /* the window may already be destroyed */
  }
};

export const toErrorPayload = (
  scope: string,
  error: unknown,
  context?: Record<string, unknown>,
): ErrorPayload => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : stringify(error);

  return {
    scope,
    message: truncate(message, 2000),
    stack:
      error instanceof Error && error.stack
        ? truncate(error.stack)
        : undefined,
    timestamp: new Date().toISOString(),
    context,
  };
};

const formatConsoleArgs = (args: unknown[]): string =>
  args.map((arg) => truncate(stringify(arg))).join(" ");

/**
 * Persists main-process logs and reports uncaught failures to the renderer so
 * the loading page can offer a report instead of leaving the app stuck.
 */
export const installMainLogging = () => {
  if (loggingInstalled) return;
  loggingInstalled = true;

  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);

  console.error = (...args: unknown[]) => {
    originalError(...args);
    writeLog("error", "console", formatConsoleArgs(args));
  };

  console.warn = (...args: unknown[]) => {
    originalWarn(...args);
    writeLog("warn", "console", formatConsoleArgs(args));
  };

  process.on("uncaughtException", (error) => {
    const payload = toErrorPayload("main", error);
    writeLog("error", "main", "Uncaught exception", error);
    notifyError(payload);
  });

  process.on("unhandledRejection", (reason) => {
    const payload = toErrorPayload("main", reason);
    writeLog("error", "main", "Unhandled rejection", reason);
    notifyError(payload);
  });
};

/**
 * Wraps every IPC handler registered after this call, so failures are written
 * to the log with the channel name while still being returned to the renderer.
 */
export const installIpcErrorLogging = () => {
  if (ipcLoggingInstalled) return;
  ipcLoggingInstalled = true;

  const originalHandle = ipcMain.handle.bind(ipcMain);

  ipcMain.handle = ((
    channel: string,
    listener: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => any,
  ) =>
    originalHandle(channel, async (event, ...args) => {
      try {
        return await listener(event, ...args);
      } catch (error) {
        writeLog("error", `ipc:${channel}`, "IPC handler failed", error);
        throw error;
      }
    })) as typeof ipcMain.handle;
};
