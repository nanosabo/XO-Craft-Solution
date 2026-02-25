import MarketItem from "@src/components/MarketItem";
import styles from "./styles/MarketItems.module.scss";
import { FC, RefObject } from "react";
import { IItemAnalytics } from "@src/store/slices/market.slice";

type Props = {
  sentinelRef: RefObject<HTMLDivElement>;
  wrapperRef: RefObject<HTMLDivElement>;
  items: IItemAnalytics[];
};

const Cards: FC<Props> = ({ items, sentinelRef, wrapperRef }) => {
  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <div className={styles.root}>
        {items.map((item) => (
          <MarketItem key={item.id} item={item} />
        ))}
      </div>
      <div
        ref={sentinelRef}
        style={{ height: "50px", background: "transparent" }}
      />
    </div>
  );
};

export default Cards;
