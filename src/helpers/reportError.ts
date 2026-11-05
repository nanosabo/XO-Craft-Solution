import { setLoaderError } from "@src/store/slices/loader.slice";
import { store } from "@src/store/store";
import { AppError, logError } from "./errorLog";
import { getLastAppRoute } from "./lastRoute";

/**
 * Logs the error and switches the loading page to its error state. Used by
 * components and global handlers; thunks call `logError` and dispatch directly
 * to avoid importing the store into a slice.
 */
export const reportError = (
  scope: string,
  error: unknown,
  context?: Record<string, unknown>,
): AppError => {
  const appError = logError(scope, error, context);

  store.dispatch(
    setLoaderError({
      error: appError,
      returnTo: getLastAppRoute(),
    }),
  );

  return appError;
};
