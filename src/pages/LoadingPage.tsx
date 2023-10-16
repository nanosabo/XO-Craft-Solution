import LoadingBottomCopyright from "@src/containers/LoadingBottomCopyright";
import LoadingLogoSection from "@src/containers/LoadingLogoSection";
import useLoaderStatus from "@src/hooks/useLoaderStatus";
import LoadingLayout from "@src/layouts/LoadingLayout";
import { setAppLoadedStatus } from "@src/store/slices/app.slice";
import { useAppDispatch } from "@src/store/store";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LoadingPage = () => {
  const { isError, isInitial, status } = useLoaderStatus();

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    isInitial &&
      new Promise((resolve) => setTimeout(resolve, 3000)).then(() => {
        dispatch(setAppLoadedStatus());
        navigate("/");
      });
  }, [isInitial, dispatch, navigate]);

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
