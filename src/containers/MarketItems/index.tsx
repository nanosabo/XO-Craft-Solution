import MarketItem from "@src/components/MarketItem";
import styles from "./styles/MarketItems.module.scss";
import useMarket from "@src/hooks/useMarket";

const MarketItems = () => {
  const { items, sentinelRef, wrapperRef } = useMarket();

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

export default MarketItems;
