import ColumnInputs from "@src/containers/ColumnInputs";
import MainPageHeader from "@src/containers/MainPageHeader";
import AnimatePageLayout from "@src/layouts/AnimatePageLayout";
import { AppStateStatus, selectAppState } from "@src/store/slices/app.slice";
import { useAppSelector } from "@src/store/store";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const MainPage = () => {
  const { status } = useAppSelector(selectAppState);
  const navigate = useNavigate();

  useEffect(() => {
    if (status === AppStateStatus.INITIAL) navigate("/loading");
  }, [navigate, status]);

  return (
    <AnimatePageLayout>
      <MainPageHeader />
      <ColumnInputs />
    </AnimatePageLayout>
  );
};

export default MainPage;
