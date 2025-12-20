import { FC } from "react";
import styles from "./styles/StatsItem.module.scss";
import SolvedIcons from "@src/ui/icons/SolvedIcons";
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
};

const StatsItem: FC<Props> = ({ info, version }) => {
  const { t } = useTranslation("solvePage", { keyPrefix: "totals" });

  const Icon = SolvedIcons[versions[version]];

  return (
    <div className={styles.root}>
      <div className={styles.text}>
        <b>
          {info}
          <span>{t(`${version}.prefix`)}</span>
        </b>
        <p>{t(`${version}.title`)}</p>
      </div>
      <Icon />
    </div>
  );
};

export default StatsItem;
