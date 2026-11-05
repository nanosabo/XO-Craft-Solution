import LoadingBottomCopyright from "@src/containers/LoadingBottomCopyright";
import LoadingErrorScreen from "@src/containers/LoadingErrorScreen";
import LoadingLogoSection from "@src/containers/LoadingLogoSection";
import { AppError } from "@src/helpers/errorLog";
import useLoaderStatus from "@src/hooks/useLoaderStatus";
import LoadingLayout from "@src/layouts/LoadingLayout";
import {
  clearLoaderError,
  setLoaderInititalStatus,
  solveData,
} from "@src/store/slices/loader.slice";
import { fetchData } from "@src/store/slices/market.slice";
import { AppStateStatus, selectAppState } from "@src/store/slices/app.slice";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const fallbackError: AppError = {
  scope: "app",
  message: "Unknown error",
  timestamp: new Date().toISOString(),
};

const LoadingPage = () => {
  const { isError, isInitial, isSolving, isSolved, status, error, errorReturnTo } =
    useLoaderStatus();
  const { status: appStatus } = useAppSelector(selectAppState);
  // Keeps the error screen rendered while the route transition removes it, so
  // the normal loading screen never flashes after "Back to the app".
  const [dismissedError, setDismissedError] = useState<AppError | null>(null);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    // The market is already loaded: after dismissing an error screen the app
    // must not start a second fetch and navigate away from the target route.
    if (!isInitial || appStatus === AppStateStatus.LOADED) return;

    // The thunk stores the error in the loader slice before rejecting, so the
    // rejection itself only needs to be consumed here.
    void dispatch(fetchData(navigate)).catch(() => undefined);
  }, [isInitial, appStatus, dispatch, navigate]);

  useEffect(() => {
    if (!isSolving) return;

    void dispatch(solveData()).catch(() => undefined);
  }, [isSolving, dispatch]);

  useEffect(() => {
    if (isSolved) {
      new Promise((resolve) => setTimeout(resolve, 1000)).then(() => {
        navigate("/solved");
      });
    }
  }, [isSolved, navigate]);

  const onErrorBack = () => {
    const canReturnToApp =
      appStatus === AppStateStatus.LOADED &&
      Boolean(errorReturnTo && errorReturnTo !== "/loading");

    if (canReturnToApp && errorReturnTo) {
      setDismissedError(error ?? fallbackError);
      dispatch(clearLoaderError());
      navigate(errorReturnTo);
      return;
    }

    dispatch(clearLoaderError());
    dispatch(setLoaderInititalStatus());
    navigate("/loading");
  };

  const shownError = error ?? dismissedError;

  if (isError || shownError) {
    return (
      <LoadingErrorScreen
        error={shownError ?? fallbackError}
        returnTo={errorReturnTo}
        onBack={onErrorBack}
      />
    );
  }

  return (
    <LoadingLayout>
      <LoadingLogoSection
        isInitialStatus={isInitial}
        isErrorStatus={isError}
        status={status}
      />

      {isInitial && <LoadingBottomCopyright />}
    </LoadingLayout>
  );
};

export default LoadingPage;
