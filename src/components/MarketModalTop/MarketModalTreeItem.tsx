import {
  setMarketModalFromTree,
  TreeItem,
} from "@src/store/slices/marketModal.slice";
import { FC } from "react";
import MarketItemImage from "../MarketItem/MarketItemImage";
import styles from "./styles/MarketModalTop.module.scss";
import classNames from "classnames";
import { rarities } from "@src/helpers/rarities";
import { useAppDispatch } from "@src/store/store";
import { motion } from "framer-motion";

interface Props extends TreeItem {
  last: boolean;
}

const MarketModalTreeItem: FC<Props> = (props) => {
  const { last, ...rest } = props;

  const dispatch = useAppDispatch();

  const onClick = () => {
    dispatch(setMarketModalFromTree({ item: props.id, treeItem: rest }));
  };

  return (
    <>
      <motion.div
        className={classNames(styles.tree_item, [
          styles[rarities[props.rarityId || 0]],
        ])}
        title={props.name}
        onClick={onClick}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0, transition: { duration: 0.1 } }}
      >
        <MarketItemImage id={props.id} />
      </motion.div>
      <div className={classNames(styles.line, { [styles.big_line]: last })} />
    </>
  );
};

export default MarketModalTreeItem;
