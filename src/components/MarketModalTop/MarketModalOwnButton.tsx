import { BackArrowIcon, EditIcon, PlusIcon } from "@src/ui/icons";
import classNames from "classnames";
import styles from "./styles/MarketModalTop.module.scss";
import { rarities } from "@src/helpers/rarities";
import useMarketModal from "@src/hooks/useMarketModal";
import { AnimatePresence, motion } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import {
  selectMarketModalState,
  switchMarketModalOwn,
} from "@src/store/slices/marketModal.slice";
import { selectMarketState } from "@src/store/slices/market.slice";

const MarketModalOwnButton = () => {
  const { item } = useMarketModal();
  const { own_recipes } = useAppSelector(selectMarketState);
  const { own_set } = useAppSelector(selectMarketModalState);
  const dispatch = useAppDispatch();

  const Icon =
    own_set === "craft"
      ? own_recipes[item.id] !== undefined
        ? EditIcon
        : PlusIcon
      : BackArrowIcon;

  const onCLick = () => {
    dispatch(switchMarketModalOwn());
  };

  return (
    <motion.button
      className={classNames(
        styles.own_recipe_btn,
        styles[rarities[item.rarityId]],
        { [styles.active]: own_set === "edit" },
      )}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      onClick={onCLick}
    >
      <AnimatePresence initial={false}>
        <motion.span
          key={own_set}
          initial={{ x: -20 }}
          animate={{ x: 0 }}
          exit={{ x: 40, position: "absolute" }}
        >
          <Icon />
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
};

export default MarketModalOwnButton;
