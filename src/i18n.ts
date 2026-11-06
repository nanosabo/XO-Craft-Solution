import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { resources } from "./locales/resources";

type AppLanguage = "ru" | "en";

const normalizeLanguage = (language: string | null | undefined): AppLanguage =>
  (language ?? "").toLowerCase().startsWith("ru") ? "ru" : "en";

/**
 * The main process needs the language before the first Crossout request to
 * choose the right crossout-info host. The i18n init callback is asynchronous,
 * so the detected language is sent immediately as well.
 */
const detectLanguage = (): AppLanguage => {
  try {
    return normalizeLanguage(
      localStorage.getItem("i18nextLng") ?? navigator.language,
    );
  } catch {
    return "en";
  }
};

window.ipcRenderer.send("lang", detectLanguage());

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({ fallbackLng: "en", debug: true, resources }, (err) => {
    if (err) return console.log("Ошибка i18n", err);

    window.ipcRenderer.send("lang", normalizeLanguage(i18n.language));
  });

i18n.on("languageChanged", (lng) => {
  window.ipcRenderer.send("lang", normalizeLanguage(lng));
});

export default i18n;
