import type { ChartData } from "@electron/fetchChartData";

export interface CraftSignal {
  hasRecipe: boolean;
  isOwn: boolean;
  profit: number;
  craftCost: number;
  sellPriceNet: number;
}

export interface ItemSignalData {
  chart: ChartData;
  craft: CraftSignal;
}
