import { IData } from "@src/store/slices/market.slice";
import axios from "axios";

export interface IUpdate {
  updated: boolean;
  data: { marketData: Record<string, IData> };
  lastUpdateTimestamp: number;
}

export const fetchUpdate = async (lastupdate: number) => {
  try {
    const response: string = (
      await axios.post("https://crossoutcore.ru/market/", [lastupdate], {
        headers: {
          Cookie: "NEXT_LOCALE=ru",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "*/*",
          "Next-Action": "6007a994cca94241fa010542ecfd4b56f344822f77",
        },
      })
    ).data;

    const cleanJson: IUpdate = response
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const jsonPart = line.substring(line.indexOf("{"));
        return JSON.parse(jsonPart);
      })[1];

    return cleanJson;
  } catch (error) {
    /* empty */
  }
};
