import { IData } from "@src/store/slices/market.slice";
import axios from "./api";
import { getLanguage } from "./main";

export interface IUpdate {
  updated: boolean;
  data: { marketData: Record<string, IData> };
  lastUpdateTimestamp: number;
}

export const fetchUpdate = async (lastupdate: number) => {
  try {
    const lang = getLanguage();
    const url = `${lang === "en" ? "en" : ""}/market/`;

    const response: string = (
      await axios.post(url, [lastupdate, lang], {
        headers: {
          Cookie: "NEXT_LOCALE=" + lang,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "*/*",
          "Next-Action": "602800bc979e30115d225b06abd01323db16a6fdad",
        },
      })
    ).data;

    const resultLine = response
      .split("\n")
      .filter(Boolean)
      .find((line) => line.startsWith("1:"));

    if (!resultLine) return;

    const raw = resultLine.slice(2).trim();

    if (!raw || raw === "null") return;

    const cleanJson: IUpdate = JSON.parse(raw);

    return cleanJson;
  } catch (error) {
    /* empty */
  }
};
