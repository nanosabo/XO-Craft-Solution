import StatsItem from "@src/components/StatsItem";
import styles from "./styles/SolveTotal.module.scss";
import { useAppSelector } from "@src/store/store";
import { selectLoaderState } from "@src/store/slices/loader.slice";

const SolveTotal = () => {
  const { solvedResult } = useAppSelector(selectLoaderState);

  if (!solvedResult) {
    return null;
  }

  const { totalDurability, totalWeight, totalPower, totalParts } = solvedResult;

  return (
    <div className={styles.root}>
      <StatsItem info={totalDurability} version="durability" />
      <StatsItem info={totalWeight} version="weight" />
      <StatsItem info={totalPower} version="power" />
      <StatsItem info={totalParts} version="partsUsed" />
    </div>
  );
};

export default SolveTotal;
