import { IItemAnalytics } from "@src/store/slices/market.slice";
import { FC } from "react";
import styles from "./styles/MarketModalOwn.module.scss";
import MarketImageSection from "../MarketImageSection";
import MarketItemImage from "../MarketItem/MarketItemImage";
import { rarities } from "@src/helpers/rarities";

type Props = {
  item: IItemAnalytics;
  onClickAdd: () => void;
};

const MarketModalOwnSearchedItem: FC<Props> = ({ item, onClickAdd }) => {
  return (
    <div className={styles.item_wrapper} onClick={onClickAdd}>
      <MarketImageSection
        className={styles.image}
        rare={rarities[item.rarityId]}
      >
        <MarketItemImage id={item.id} />
      </MarketImageSection>

      <p>{item.name}</p>
    </div>
  );
};

export default MarketModalOwnSearchedItem;
