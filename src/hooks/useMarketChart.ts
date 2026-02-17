import * as echarts from "echarts";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import {
  selectMarketModalState,
  setMarketModalChart,
} from "@src/store/slices/marketModal.slice";
import { ChartData } from "@electron/fetchChartData";

interface ZoomState {
  start: number;
  end: number;
}

const useMarketChart = () => {
  const { chartData: data } = useAppSelector(selectMarketModalState);
  const [zoom, setZoom] = useState<ZoomState>({ start: 99.5, end: 100 });

  const dispatch = useAppDispatch();

  const zoomRef = useRef<ZoomState>(zoom);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const onEvents = {
    dataZoom: (params: {
      start?: number;
      end?: number;
      batch?: ZoomState[];
    }) => {
      const start = params.batch ? params.batch[0].start : params.start;
      const end = params.batch ? params.batch[0].end : params.end;

      if (typeof start === "number" && typeof end === "number") {
        setZoom({ start, end });
      }
    },
  };

  useEffect(() => {
    const listener = (_: Electron.IpcRendererEvent, items: ChartData) => {
      dispatch(setMarketModalChart(items));
    };

    window.ipcRenderer.on("updateChart", listener);

    return () => {
      window.ipcRenderer.removeListener("updateChart", listener);
    };
  }, [dispatch]);

  const options: echarts.EChartsOption = useMemo(
    () => ({
      backgroundColor: "transparent",
      textStyle: { fontFamily: "Roboto, sans-serif" },

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
          sampling: "average", // Обязательно для уменьшения нагрузки на GPU
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
          sampling: "average", // Обязательно для уменьшения нагрузки на GPU
          large: true,
          largeThreshold: 2000,
          z: 10,
        },
        {
          name: "Предложения",
          type: "line",
          yAxisIndex: 1,
          data: data.so,
          symbol: "none",
          sampling: "average",
          lineStyle: { width: 0 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(120, 100, 80, 0.5)" },
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
          sampling: "average",
          large: true,
          largeThreshold: 2000,
          lineStyle: { width: 0 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(80, 120, 150, 0.4)" },
              { offset: 1, color: "rgba(80, 120, 150, 0)" },
            ]),
          },
          z: 4,
        },
      ],

      dataZoom: [
        {
          type: "inside",
          start: zoomRef.current.start,
          end: zoomRef.current.end,
        },
        {
          type: "slider",
          start: zoomRef.current.start,
          end: zoomRef.current.end,
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

  const loadingOption = {
    text: "ЗАГРУЗКА",
    color: "#fffc4d",
    textColor: "#888",
    maskColor: "rgba(17, 19, 22, 0.6)",
    zlevel: 0,
    fontSize: 11,
    spinnerRadius: 15,
    lineWidth: 3,
  };

  const showLoading = data.t.length === 0;

  return { options, onEvents, showLoading, loadingOption };
};

export default useMarketChart;
