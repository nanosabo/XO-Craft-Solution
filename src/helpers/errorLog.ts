export interface AppError {
  scope: string;
  message: string;
  stack?: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

const MAX_MESSAGE_LENGTH = 2000;
const MAX_STACK_LENGTH = 8000;

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

const truncate = (value: string, limit: number): string =>
  value.length > limit ? `${value.slice(0, limit)}… [truncated]` : value;

/** Converts anything thrown by the app into the shape used by the error page. */
export const toAppError = (
  scope: string,
  error: unknown,
  context?: Record<string, unknown>,
): AppError => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : stringify(error);

  return {
    scope,
    message: truncate(message || "Unknown error", MAX_MESSAGE_LENGTH),
    stack:
      error instanceof Error && error.stack
        ? truncate(error.stack, MAX_STACK_LENGTH)
        : undefined,
    timestamp: new Date().toISOString(),
    context,
  };
};

/**
 * Writes an error to the main-process log. Logging must never break the app,
 * so any failure of the IPC bridge is silently ignored.
 */
export const logError = (
  scope: string,
  error: unknown,
  context?: Record<string, unknown>,
): AppError => {
  const appError = toAppError(scope, error, context);

  try {
    window.electronAPI?.logError?.({
      level: "error",
      scope: appError.scope,
      message: appError.message,
      details: {
        stack: appError.stack,
        context: appError.context,
      },
    });
  } catch {
    /* the log is best-effort only */
  }

  return appError;
};

/** Logs a recoverable failure without showing the full error screen. */
export const logWarning = (
  scope: string,
  error: unknown,
  context?: Record<string, unknown>,
): AppError => {
  const appError = toAppError(scope, error, context);

  try {
    window.electronAPI?.logError?.({
      level: "warn",
      scope: appError.scope,
      message: appError.message,
      details: {
        stack: appError.stack,
        context: appError.context,
      },
    });
  } catch {
    /* the log is best-effort only */
  }

  return appError;
};
