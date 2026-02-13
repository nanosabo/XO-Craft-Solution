import {
  IItemAnalytics,
  selectMarketState,
} from "@src/store/slices/market.slice";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

const sortMapping: Record<string, (item: IItemAnalytics) => number> = {
  sell_offers: (item) => item.offers.s,
  buy_offers: (item) => item.offers.b,
  sell_price: (item) => item.rawPrices.s,
  buy_price: (item) => item.rawPrices.b,
  spread: (item) => item.spread,
  profit: (item) => item.profit,
};

const useMarket = () => {
  const {
    items,
    categoryFilter,
    rarityFilter,
    search,
    sort_by,
    sort_order,
    followed,
    followedItems,
  } = useSelector(selectMarketState);

  const [limit, setLimit] = useState(18);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredAndSorted = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    const categorySet = new Set(categoryFilter);
    const followedSet = new Set(followedItems);
    const raritySet = new Set(rarityFilter);
    const hasSpecialCat = categorySet.has(7) || categorySet.has(9);

    const result = items.filter((item) => {
      if (followed) {
        const match = followedSet.has(item.id);
        if (!match) return false;
      }
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm))
        return false;
      if (categoryFilter.length > 0) {
        const isSpecial = item.categoryId === 7 || item.categoryId === 9;
        const match = isSpecial
          ? hasSpecialCat
          : categorySet.has(item.categoryId);
        if (!match) return false;
      }
      if (rarityFilter.length > 0 && !raritySet.has(item.rarityId))
        return false;
      return true;
    });

    const getValue = sortMapping[sort_by];
    if (getValue) {
      result.sort((a, b) => {
        const valA = getValue(a);
        const valB = getValue(b);
        return sort_order === "asc" ? valA - valB : valB - valA;
      });
    }

    return result;
  }, [
    search,
    categoryFilter,
    rarityFilter,
    items,
    sort_by,
    sort_order,
    followed,
    followedItems,
  ]);

  useEffect(() => {
    if (wrapperRef.current) {
      setLimit(18);
      wrapperRef.current.scrollTop = 0;
    }
  }, [
    categoryFilter,
    rarityFilter,
    search,
    sort_by,
    sort_order,
    followed,
    followedItems,
  ]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && limit < filteredAndSorted.length) {
          setLimit((prev) => prev + 18);
        }
      },
      { rootMargin: "200px" },
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [limit, filteredAndSorted.length]);

  const visibleItems = filteredAndSorted.slice(0, limit);

  return { items: visibleItems, sentinelRef, wrapperRef };
};

export default useMarket;
