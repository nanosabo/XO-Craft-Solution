import StatsItem from "@src/components/StatsItem";
import styles from "./styles/SolveTotal.module.scss";
import { useAppSelector } from "@src/store/store";
import { selectLoaderState } from "@src/store/slices/loader.slice";
import { selectSolveInputsState } from "@src/store/slices/solveInputs.slice";
import { useTranslation } from "react-i18next";

export const excessOver = (value: number, limit: number) => {
  const over = value - limit;

  if (!(over > 0)) return 0;

  return Math.max(1, Math.round(over));
};

/** Matching the tonnage already counts as 1 kg over the red line. */
export const weightExcess = (totalWeight: number, tonnage: number) =>
  excessOver(totalWeight, tonnage - 1);

const SolveTotal = () => {
  const { t } = useTranslation("solvePage", { keyPrefix: "totals" });
  const { solvedResult } = useAppSelector(selectLoaderState);
  const { tonnage, maxPowerScores } = useAppSelector(selectSolveInputsState);

  if (!solvedResult) {
    return null;
  }

  const { totalDurability, totalWeight, totalPower, totalParts, openDurability } =
    solvedResult;
  const weightOver = weightExcess(totalWeight, tonnage);
  const powerOver =
    maxPowerScores > 0 ? excessOver(totalPower, maxPowerScores) : 0;

  return (
    <div className={styles.root}>
      <StatsItem
        info={totalDurability}
        version="durability"
        note={
          typeof openDurability === "number" &&
          openDurability !== totalDurability
            ? String(openDurability)
            : undefined
        }
        noteTitle={
          typeof openDurability === "number" &&
          openDurability !== totalDurability
            ? t("durability.openFull", { value: openDurability })
            : undefined
        }
      />
      <StatsItem
        info={totalWeight}
        version="weight"
        warning={
          weightOver > 0
            ? t("weight.exceeded", { over: weightOver })
            : undefined
        }
        warningTitle={
          weightOver > 0
            ? t("weight.exceededFull", { over: weightOver })
            : undefined
        }
      />
      <StatsItem
        info={totalPower}
        version="power"
        warning={
          powerOver > 0 ? t("power.exceeded", { over: powerOver }) : undefined
        }
        warningTitle={
          powerOver > 0
            ? t("power.exceededFull", { over: powerOver })
            : undefined
        }
      />
      <StatsItem info={totalParts} version="partsUsed" />
    </div>
  );
};

export default SolveTotal;
