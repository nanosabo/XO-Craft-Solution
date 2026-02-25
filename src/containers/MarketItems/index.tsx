import useMarket from "@src/hooks/useMarket";
import Cards from "./Cards";
import Table from "./Table";

const MarketItems = () => {
  const { items, sentinelRef, wrapperRef, view } = useMarket();

  return view === "cards" ? (
    <Cards items={items} sentinelRef={sentinelRef} wrapperRef={wrapperRef} />
  ) : (
    <Table items={items} sentinelRef={sentinelRef} wrapperRef={wrapperRef} />
  );
};

export default MarketItems;
