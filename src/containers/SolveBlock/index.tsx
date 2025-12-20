import BlockTitle from "@src/components/BlockTitle";
import SolveTotal from "../SolveTotal";
import { useTranslation } from "react-i18next";
import styles from "./styles/SolveBlock.module.scss";
import SolvedParts from "../SolvedParts";

const SolveBlock = () => {
  const { t } = useTranslation("solvePage");
  return (
    <div className={styles.root}>
      <SolveTotal />

      <div className={styles.parts}>
        <BlockTitle title={t("parts.title")} subtitle={t("parts.subtitle")} />

        <SolvedParts />
      </div>
    </div>
  );
};

export default SolveBlock;
