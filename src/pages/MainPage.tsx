import PageTitle from "@src/components/PageTitle";
import ColumnInputs from "@src/containers/ColumnInputs";
import AnimatePageLayout from "@src/layouts/AnimatePageLayout";
import { AppStateStatus, selectAppState } from "@src/store/slices/app.slice";
import { useAppSelector } from "@src/store/store";
import BigButton from "@src/ui/BigButton";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const MainPage = () => {
  const { status } = useAppSelector(selectAppState);
  const navigate = useNavigate();

  const { t } = useTranslation("mainPage");

  useEffect(() => {
    if (status === AppStateStatus.INITIAL) navigate("/loading");
  }, [navigate, status]);

  return (
    <AnimatePageLayout>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <PageTitle title={t("header.title")} subtitle={t("header.subtitle")} />
        <BigButton>{t("solve.title")}</BigButton>
      </div>
      <ColumnInputs />
    </AnimatePageLayout>
  );
};

export default MainPage;
