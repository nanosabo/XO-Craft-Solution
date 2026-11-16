import useMarket from "@src/hooks/useMarket";
import { useTranslation } from "react-i18next";
import Cards from "./Cards";
import Table from "./Table";
import styles from "./styles/MarketItems.module.scss";

const MarketItems = () => {
  const { t } = useTranslation("marketPage");
  const { items, sentinelRef, wrapperRef, view, followedEmpty } = useMarket();

  if (followedEmpty) {
    return (
      <p className={styles.empty}>
        {t(followedEmpty === "none" ? "followed.empty" : "followed.notFound")}
      </p>
    );
  }

  return view === "cards" ? (
    <Cards items={items} sentinelRef={sentinelRef} wrapperRef={wrapperRef} />
  ) : (
    <Table items={items} sentinelRef={sentinelRef} wrapperRef={wrapperRef} />
  );
};

export default MarketItems;
