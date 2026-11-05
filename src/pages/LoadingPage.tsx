import LoadingBottomCopyright from "@src/containers/LoadingBottomCopyright";
import LoadingErrorScreen from "@src/containers/LoadingErrorScreen";
import LoadingLogoSection from "@src/containers/LoadingLogoSection";
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
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LoadingPage = () => {
  const { isError, isInitial, isSolving, isSolved, status, error, errorReturnTo } =
    useLoaderStatus();
  const { status: appStatus } = useAppSelector(selectAppState);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isInitial) return;

    // The thunk stores the error in the loader slice before rejecting, so the
    // rejection itself only needs to be consumed here.
    void dispatch(fetchData(navigate)).catch(() => undefined);
  }, [isInitial, dispatch, navigate]);

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
    dispatch(clearLoaderError());

    const canReturnToApp =
      appStatus === AppStateStatus.LOADED &&
      Boolean(errorReturnTo && errorReturnTo !== "/loading");

    if (canReturnToApp && errorReturnTo) {
      navigate(errorReturnTo);
      return;
    }

    dispatch(setLoaderInititalStatus());
    navigate("/loading");
  };

  if (isError) {
    return (
      <LoadingErrorScreen
        error={
          error ?? {
            scope: "app",
            message: "Unknown error",
            timestamp: new Date().toISOString(),
          }
        }
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
