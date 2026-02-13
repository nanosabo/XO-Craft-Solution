import MarketCategories from "./MarketCategories";
import MarketOther from "./MarketOther";
import MarketRarities from "./MarketRarities";
import MarketSearch from "./MarketSearch";
import MarketSort from "./MarketSort";
import MarketView from "./MarketView";
import styles from "./styles/MarketFilters.module.scss";

const MarketFilters = () => {
  return (
    <div className={styles.root}>
      <MarketSearch />
      <MarketCategories />
      <MarketRarities />
      <MarketView />
      <MarketSort />
      <MarketOther />
    </div>
  );
};

export default MarketFilters;
