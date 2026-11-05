import {
  LoaderStateStatus,
  selectLoaderState,
} from "@src/store/slices/loader.slice";
import { useAppSelector } from "@src/store/store";

const useLoaderStatus = () => {
  const { status, error, errorReturnTo } = useAppSelector(selectLoaderState);

  const isInitial = status === LoaderStateStatus.INITIAL;
  const isError = status === LoaderStateStatus.ERROR || error !== null;
  const isSolving = status === LoaderStateStatus.SOLVING;
  const isSolved = status === LoaderStateStatus.SOLVED;

  return {
    status,
    error,
    errorReturnTo,
    isError,
    isSolving,
    isSolved,
    isInitial,
  };
};

export default useLoaderStatus;
