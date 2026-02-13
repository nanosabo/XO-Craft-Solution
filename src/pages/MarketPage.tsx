import MarketFilters from "@src/containers/MarketFilters";
import MarketItems from "@src/containers/MarketItems";
import AnimatePageLayout from "@src/layouts/AnimatePageLayout";
import {
  MarketStateStatus,
  selectMarketState,
} from "@src/store/slices/market.slice";
import { useAppSelector } from "@src/store/store";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const MarketPage = () => {
  const { status } = useAppSelector(selectMarketState);
  const navigate = useNavigate();

  useEffect(() => {
    if (status === MarketStateStatus.INITIAL) navigate("/loading");
  }, [navigate, status]);

  return (
    <AnimatePageLayout>
      <MarketFilters />
      <MarketItems />
    </AnimatePageLayout>
  );
};

export default MarketPage;
