import MarketFilterButton from "@src/components/MarketFilterButton";
import MarketSectionFilter from "@src/components/MarketSectionFilter";
import styles from "./styles/MarketFilters.module.scss";
import MarketIcons from "@src/ui/icons/MarketFilterIcons";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import {
  resetMarketFilter,
  selectMarketState,
  switchMarketFollowed,
} from "@src/store/slices/market.slice";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

const MarketOther = () => {
  const { followed } = useAppSelector(selectMarketState);
  const dispatch = useAppDispatch();
  const { t } = useTranslation("marketPage");

  const onReset = useCallback(() => {
    dispatch(resetMarketFilter());
  }, [dispatch]);

  const onFollowed = useCallback(() => {
    dispatch(switchMarketFollowed());
  }, [dispatch]);

  return (
    <MarketSectionFilter title="">
      <div className={styles.buttons}>
        <MarketFilterButton title={t("titles.clear_filters")} onClick={onReset}>
          <MarketIcons.BackIcon />
        </MarketFilterButton>

        <MarketFilterButton
          title={t("titles.followed")}
          onClick={onFollowed}
          isActive={followed}
        >
          <MarketIcons.BellIcon />
        </MarketFilterButton>
      </div>
    </MarketSectionFilter>
  );
};

export default MarketOther;
