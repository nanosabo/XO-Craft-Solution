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
          // Keeps the whole modal inside short windows; full height on tall ones.
          height: "clamp(184px, calc(100vh - 460px), 224px)",
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
