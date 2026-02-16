import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { useMemo } from "react";
import { useAppSelector } from "@src/store/store";
import { selectMarketModalState } from "@src/store/slices/marketModal.slice";

const MarketModalChart = () => {
  const { chartData: data } = useAppSelector(selectMarketModalState);

  const options = useMemo(
    () => ({
      backgroundColor: "transparent", // Прозрачный фон
      textStyle: { fontFamily: "Roboto, sans-serif" },
      progressive: 2000, // Рисовать по 2000 точек за раз
      progressiveThreshold: 3000,

      grid: {
        left: "50",
        right: "50",
        bottom: "60",
        top: "40",
        containLabel: false,
      },

      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(28, 28, 28, 0.9)", // Темный тултип
        borderColor: "#444",
        textStyle: { color: "#eee" },
        axisPointer: {
          type: "cross",
          lineStyle: { color: "#555", type: "dashed" },
        },
      },

      xAxis: {
        type: "category",
        data: data.t,
        boundaryGap: false,
        axisLine: { lineStyle: { color: "#444" } },
        axisLabel: { color: "#888", fontSize: 11, margin: 15 },
        splitLine: { show: false },
      },

      yAxis: [
        {
          type: "value",
          name: "Цена",
          nameTextStyle: { color: "#666", align: "right" },
          position: "left",
          splitLine: { lineStyle: { color: "#333", type: "dashed" } },
          axisLabel: { color: "#888" },
        },
        {
          type: "value",
          name: "Лоты",
          nameTextStyle: { color: "#666", align: "left" },
          position: "right",
          splitLine: { show: false },
          axisLabel: { color: "#888" },
        },
      ],

      series: [
        {
          name: "Продажа",
          type: "line",
          step: "end", // Ступенчатый график как на скриншоте
          data: data.s,
          symbol: "none",
          lineStyle: { width: 2, color: "#fffc4d" }, // Красный
          sampling: "lttb", // Обязательно для уменьшения нагрузки на GPU
          large: true,
          largeThreshold: 2000,
          z: 10,
        },
        {
          name: "Покупка",
          type: "line",
          step: "end",
          data: data.b,
          symbol: "none",
          lineStyle: { width: 2, color: "#6bff4d" }, // Синий
          sampling: "lttb", // Обязательно для уменьшения нагрузки на GPU
          large: true,
          largeThreshold: 2000,
          z: 10,
        },
        {
          name: "Предложения",
          type: "line", // Используем линию с заливкой для оптимизации
          yAxisIndex: 1,
          data: data.so,
          symbol: "none",
          sampling: "lttb",
          lineStyle: { width: 0 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(120, 100, 80, 0.5)" }, // Коричневатый/золотой
              { offset: 1, color: "rgba(120, 100, 80, 0)" },
            ]),
          },
          z: 5,
          large: true,
          largeThreshold: 2000,
        },
        {
          name: "Запросы",
          type: "line",
          yAxisIndex: 1,
          data: data.bo,
          symbol: "none",
          sampling: "lttb", // Обязательно для уменьшения нагрузки на GPU
          large: true,
          largeThreshold: 2000,
          lineStyle: { width: 0 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(80, 120, 150, 0.4)" }, // Грязно-синий
              { offset: 1, color: "rgba(80, 120, 150, 0)" },
            ]),
          },
          z: 4,
        },
      ],

      // Кастомизация слайдера зума под стиль интерфейса
      dataZoom: [
        {
          type: "inside",
          start: 99,
          end: 100,
        },
        {
          type: "slider",
          start: 99,
          end: 100,
          height: 30,
          bottom: 5,
          backgroundColor: "rgba(255,255,255,0.05)",
          borderColor: "transparent",
          fillerColor: "rgba(255, 255, 255, 0.1)",
          handleIcon:
            "path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z",
          handleSize: "80%",
          handleStyle: { color: "#666" },
          moveHandleStyle: { color: "#444" },
          dataBackground: {
            lineStyle: { color: "#444" },
            areaStyle: { color: "#222" },
          },
          selectedDataBackground: {
            lineStyle: { color: "#888" },
            areaStyle: { color: "#444" },
          },
        },
      ],
    }),
    [data],
  );

  return (
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
        overflow: data.t.length === 0 ? "hidden" : "visible",
      }}
      notMerge={true}
      showLoading={data.t.length === 0}
      loadingOption={{
        text: "ЗАГРУЗКА",
        color: "#fffc4d",
        textColor: "#888",
        maskColor: "rgba(17, 19, 22, 0.6)",
        zlevel: 0,
        fontSize: 11,
        spinnerRadius: 15,
        lineWidth: 3,
      }}
    />
  );
};

export default MarketModalChart;
