import LoadingBottomCopyright from "@src/containers/LoadingBottomCopyright";
import LoadingLogoSection from "@src/containers/LoadingLogoSection";
import useLoaderStatus from "@src/hooks/useLoaderStatus";
import LoadingLayout from "@src/layouts/LoadingLayout";
import { solveData } from "@src/store/slices/loader.slice";
import { fetchData } from "@src/store/slices/market.slice";
import { useAppDispatch } from "@src/store/store";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LoadingPage = () => {
  const { isError, isInitial, isSolving, isSolved, status } = useLoaderStatus();

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    isInitial && dispatch(fetchData(navigate));
  }, [isInitial, dispatch, navigate]);

  useEffect(() => {
    if (isSolving) {
      dispatch(solveData());
    }
  }, [isSolving, dispatch]);

  useEffect(() => {
    if (isSolved) {
      new Promise((resolve) => setTimeout(resolve, 1000)).then(() => {
        navigate("/solved");
      });
    }
  }, [isSolved, navigate]);

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
