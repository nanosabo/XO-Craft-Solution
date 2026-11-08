import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { normalizeUiLanguage } from "./helpers/contentLanguage";
import { resources } from "./locales/resources";

/**
 * The main process needs the language before the first Crossout request to
 * choose the right crossout-info host. The i18n init callback is asynchronous,
 * so the detected language is sent immediately as well.
 */
const detectLanguage = () => {
  try {
    return normalizeUiLanguage(
      localStorage.getItem("i18nextLng") ?? navigator.language,
    );
  } catch {
    return "en" as const;
  }
};

window.ipcRenderer.send("lang", detectLanguage());

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init(
    {
      fallbackLng: "en",
      supportedLngs: ["ru", "en", "uk"],
      nonExplicitSupportedLngs: true,
      load: "languageOnly",
      debug: true,
      resources,
    },
    (err) => {
      if (err) return console.log("Ошибка i18n", err);

      window.ipcRenderer.send("lang", normalizeUiLanguage(i18n.language));
    },
  );

i18n.on("languageChanged", (lng) => {
  window.ipcRenderer.send("lang", normalizeUiLanguage(lng));
});

export default i18n;
