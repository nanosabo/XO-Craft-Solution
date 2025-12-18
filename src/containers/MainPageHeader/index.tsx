import PageTitle from "@src/components/PageTitle";
import BigButton from "@src/ui/BigButton";
import { useTranslation } from "react-i18next";
import styles from "./styles/MainPageHeader.module.scss";
import { useAppSelector } from "@src/store/store";
import { selectSolveInputsState } from "@src/store/slices/solveInputs.slice";
import { selectRequiredPartsState } from "@src/store/slices/requiredParts.slice";

const MainPageHeader = () => {
  const { t } = useTranslation("mainPage");

  const inputs = useAppSelector(selectSolveInputsState);
  const { parts } = useAppSelector(selectRequiredPartsState);

  const onClickSolve = () => {
    window.ipcRenderer
      .invoke("solve", { inputs, requiredParts: parts })
      .then(console.log);
  };

  return (
    <div className={styles.header}>
      <PageTitle title={t("header.title")} subtitle={t("header.subtitle")} />
      <BigButton onClick={onClickSolve}>{t("solve.title")}</BigButton>
    </div>
  );
};

export default MainPageHeader;
