import { useAppSelector } from "@src/store/store";
import styles from "./styles/MarketModalTop.module.scss";
import { selectMarketModalState } from "@src/store/slices/marketModal.slice";
import MarketModalTreeItem from "./MarketModalTreeItem";
import { AnimatePresence } from "framer-motion";

const MarketModalTree = () => {
  const { tree } = useAppSelector(selectMarketModalState);

  const width = tree.length * 62 + 60;

  return (
    <AnimatePresence>
      <div className={styles.tree} style={{ width }}>
        {tree.map((item, index) => (
          <MarketModalTreeItem
            key={item.id}
            {...item}
            last={tree.length - 1 === index}
          />
        ))}
      </div>
    </AnimatePresence>
  );
};

export default MarketModalTree;
