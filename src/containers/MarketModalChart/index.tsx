import useMarketChart from "@src/hooks/useMarketChart";
import ReactECharts from "echarts-for-react";
import MarketPriceScale from "./MarketPriceScale";
import styles from "./styles/MarketModalChart.module.scss";

const MarketModalChart = () => {
  const { options, onEvents, showLoading, loadingOption } = useMarketChart();

  return (
    <div className={styles.root}>
      <MarketPriceScale />

      <ReactECharts
        option={options}
        opts={{ renderer: "canvas" }}
        style={{
          height: "224px",
          width: "calc(100% + 30px)",
          transform: "translateX(-15px)",
          zIndex: 100,
          touchAction: "none",
          borderRadius: "12px",
          overflow: showLoading ? "hidden" : "visible",
        }}
        notMerge={true}
        showLoading={showLoading}
        onEvents={onEvents}
        loadingOption={loadingOption}
      />
    </div>
  );
};

export default MarketModalChart;
