import axios from "axios";

export const fetchItems = async () => {
  try {
    const response = await axios.get("https://crossoutcore.ru/market/", {
      headers: {
        RSC: "1",
        Cookie: "NEXT_LOCALE=ru",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
    });

    const payload = response.data;
    const lines = payload.split("\n");

    for (const line of lines) {
      if (line.includes('"initialData":{"items":[')) {
        const jsonStartIndex = line.indexOf("{");
        if (jsonStartIndex === -1) continue;

        const cleanJson = line.substring(jsonStartIndex);

        try {
          const data = JSON.parse(cleanJson);
          return data;
        } catch (e) {
          const lastBrace = cleanJson.lastIndexOf("}");
          const fixedJson = cleanJson.substring(0, lastBrace + 1);

          const data = JSON.parse(fixedJson);

          return data;
        }
      }
    }

    throw new Error("Ключ initialData не найден");
  } catch (error) {
    /* empty */
  }
};
