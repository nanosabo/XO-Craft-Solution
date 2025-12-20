import PageTitle from "@src/components/PageTitle";
import BigButton from "@src/ui/BigButton";
import { useTranslation } from "react-i18next";
import styles from "./styles/MainPageHeader.module.scss";
import { useAppDispatch } from "@src/store/store";
import { useNavigate } from "react-router-dom";
import { setLoaderSolvingStatus } from "@src/store/slices/loader.slice";

const MainPageHeader = () => {
  const { t } = useTranslation("mainPage");

  const navigate = useNavigate();

  const dispatch = useAppDispatch();

  const onClickSolve = () => {
    dispatch(setLoaderSolvingStatus());
    navigate("/loading");
  };

  return (
    <div className={styles.header}>
      <PageTitle title={t("header.title")} subtitle={t("header.subtitle")} />
      <BigButton onClick={onClickSolve}>{t("solve.title")}</BigButton>
    </div>
  );
};

export default MainPageHeader;
