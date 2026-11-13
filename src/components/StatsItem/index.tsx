import { FC } from "react";
import styles from "./styles/StatsItem.module.scss";
import SolvedIcons from "@src/ui/icons/SolvedIcons";
import classNames from "classnames";
import { useTranslation } from "react-i18next";

const versions: { [key: string]: keyof typeof SolvedIcons } = {
  weight: "GradientWeightIcon",
  power: "GradientFlashIcon",
  durability: "GradientShieldIcon",
  partsUsed: "GradientPuzzleIcon",
};

type Props = {
  info: number;
  version: "weight" | "power" | "durability" | "partsUsed";
  warning?: string;
  warningTitle?: string;
};

const StatsItem: FC<Props> = ({ info, version, warning, warningTitle }) => {
  const { t } = useTranslation("solvePage", { keyPrefix: "totals" });

  const Icon = SolvedIcons[versions[version]];

  return (
    <div
      className={classNames(styles.root, warning && styles.exceeded)}
      title={warningTitle ?? warning}
    >
      <div className={styles.text}>
        <p>{warning ?? t(`${version}.title`)}</p>
        <b>
          {info}
          <span>{t(`${version}.prefix`)}</span>
        </b>
      </div>
      <span className={styles.icon}>
        <Icon />
      </span>
    </div>
  );
};

export default StatsItem;
