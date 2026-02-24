import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { resources } from "./locales/resources";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({ fallbackLng: "en", debug: true, resources }, (err) => {
    if (err) return console.log("Ошибка i18n", err);

    const initialLng = i18n.language;
    window.ipcRenderer.send("lang", initialLng);
  });

i18n.on("languageChanged", (lng) => {
  window.ipcRenderer.send("lang", lng);
});

export default i18n;
