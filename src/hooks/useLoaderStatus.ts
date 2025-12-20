import {
  LoaderStateStatus,
  selectLoaderState,
} from "@src/store/slices/loader.slice";
import { useAppSelector } from "@src/store/store";

const useLoaderStatus = () => {
  const { status } = useAppSelector(selectLoaderState);

  const isInitial = status === LoaderStateStatus.INITIAL;
  const isError = status === LoaderStateStatus.ERROR;
  const isSolving = status === LoaderStateStatus.SOLVING;
  const isSolved = status === LoaderStateStatus.SOLVED;

  return { status, isError, isSolving, isSolved, isInitial };
};

export default useLoaderStatus;
