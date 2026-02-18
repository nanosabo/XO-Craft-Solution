import { IItemAnalytics, OwnRecipeIng } from "@src/store/slices/market.slice";
import { useAppDispatch } from "@src/store/store";
import { motion } from "framer-motion";
import { FC } from "react";
import styles from "./styles/MarketModalOwn.module.scss";
import MarketModalOwnSearchedItem from "./MarketModalOwnSearchedItem";
import { addOwnRecipeIng } from "@src/store/slices/marketModal.slice";

type Props = {
  items: IItemAnalytics[];
  onClose: () => void;
};

const MarketModalSearched: FC<Props> = ({ items, onClose }) => {
  const dispatch = useAppDispatch();

  const onClickAdd = (item: IItemAnalytics) => {
    return () => {
      const ing: OwnRecipeIng = {
        id: item.id,
        name: item.name,
        amount: item.categoryId === 8 ? 100 : 1,
        categoryId: item.categoryId,
        rarityId: item.rarityId,
      };
      dispatch(addOwnRecipeIng(ing));
      onClose();
    };
  };

  return (
    <motion.div
      className={styles.searched}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {items.map((item) => (
        <MarketModalOwnSearchedItem
          key={item.id}
          item={item}
          onClickAdd={onClickAdd(item)}
        />
      ))}
    </motion.div>
  );
};

export default MarketModalSearched;
