import Info from "./Info";
import Recipe from "./Recipe";
import styles from "./styles/MarketModalBottom.module.scss";

const MarketModalBottom = () => {
  return (
    <div className={styles.root}>
      <Recipe />
      <Info />
    </div>
  );
};

export default MarketModalBottom;
