import PageTitle from "@src/components/PageTitle";
import BigButton from "@src/ui/BigButton";
import { useTranslation } from "react-i18next";
import styles from "./styles/MainPageHeader.module.scss";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@src/store/store";
import { setLoaderSolvingStatus } from "@src/store/slices/loader.slice";

const SolvePageHeader = () => {
  const { t } = useTranslation("solvePage");

  const navigate = useNavigate();

  const dispatch = useAppDispatch();

  const onClickSolve = () => {
    dispatch(setLoaderSolvingStatus());
    navigate("/loading");
  };

  return (
    <div className={styles.header}>
      <PageTitle title={t("header.title")} subtitle={t("header.subtitle")} />
      <BigButton onClick={onClickSolve}>{t("resolve.title")}</BigButton>
    </div>
  );
};

export default SolvePageHeader;
