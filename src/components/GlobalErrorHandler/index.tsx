import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppError } from "@src/helpers/errorLog";
import { getLastAppRoute, setLastAppRoute } from "@src/helpers/lastRoute";
import { reportError } from "@src/helpers/reportError";
import { setLoaderError } from "@src/store/slices/loader.slice";
import { useAppDispatch, useAppSelector } from "@src/store/store";

/**
 * Catches errors that do not go through a thunk (window errors, unhandled
 * promises and failures reported by the main process) and switches the app to
 * the loading page's error state.
 */
const GlobalErrorHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const error = useAppSelector((state) => state.loader.error);

  useEffect(() => {
    setLastAppRoute(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    if (error && location.pathname !== "/loading") {
      navigate("/loading");
    }
  }, [error, location.pathname, navigate]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (!(event instanceof ErrorEvent)) return;

      reportError("window", event.error ?? event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      reportError("promise", event.reason);
    };

    const handleMainError = (
      _: Electron.IpcRendererEvent,
      payload: AppError,
    ) => {
      dispatch(setLoaderError({ error: payload, returnTo: getLastAppRoute() }));
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    window.ipcRenderer?.on("app-error", handleMainError);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
      window.ipcRenderer?.removeListener("app-error", handleMainError);
    };
  }, [dispatch]);

  return null;
};

export default GlobalErrorHandler;
