import SolvePageHeader from "@src/containers/Headers/SolvePageHeader";
import SolveBlock from "@src/containers/SolveBlock";
import AnimatePageLayout from "@src/layouts/AnimatePageLayout";
import { AppStateStatus, selectAppState } from "@src/store/slices/app.slice";
import { useAppSelector } from "@src/store/store";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SolvedPage = () => {
  const { status } = useAppSelector(selectAppState);
  const navigate = useNavigate();

  useEffect(() => {
    if (status === AppStateStatus.INITIAL) navigate("/loading");
  }, [navigate, status]);

  return (
    <AnimatePageLayout>
      <SolvePageHeader />
      <SolveBlock />
    </AnimatePageLayout>
  );
};

export default SolvedPage;
