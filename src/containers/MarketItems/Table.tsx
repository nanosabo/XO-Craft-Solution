import { FC, RefObject } from "react";
import styles from "./styles/MarketItems.module.scss";
import TableItem from "./TableItem";
import { IItemAnalytics } from "@src/store/slices/market.slice";
import TableHeader from "./TableHeader";

type Props = {
  sentinelRef: RefObject<HTMLDivElement>;
  wrapperRef: RefObject<HTMLDivElement>;
  items: IItemAnalytics[];
};

const Table: FC<Props> = ({ items, sentinelRef, wrapperRef }) => {
  return (
    <div className={styles.market}>
      <TableHeader />

      <div ref={wrapperRef} className={styles.wrapper}>
        <div className={styles.market__wrapper}>
          {items.map((item) => (
            <TableItem key={item.id} item={item} />
          ))}
        </div>

        <div
          ref={sentinelRef}
          style={{ height: "50px", background: "transparent" }}
        />
      </div>
    </div>
  );
};

export default Table;
