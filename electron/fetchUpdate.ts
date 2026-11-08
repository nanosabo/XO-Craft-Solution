import { IData } from "@src/store/slices/market.slice";
import { getFallbackActionId, postServerAction } from "./actionIds";
import { getContentLanguage } from "./main";

export interface IUpdate {
  updated: boolean;
  data: { marketData: Record<string, IData> };
  lastUpdateTimestamp: number;
  serverTime?: number;
}

export const fetchUpdate = async (
  lastupdate: number,
  knownActionId?: string,
) => {
  try {
    const lang = getContentLanguage();
    const url = `${lang === "en" ? "en" : ""}/market/`;

    const response = await postServerAction(
      "checkUpdateStatus",
      url,
      [lastupdate, lang],
      {
        Cookie: "NEXT_LOCALE=" + lang,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
      knownActionId ?? getFallbackActionId("checkUpdateStatus"),
    );

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
