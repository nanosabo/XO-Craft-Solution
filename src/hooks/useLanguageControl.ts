import { useTranslation } from "react-i18next";
import {
  normalizeUiLanguage,
  type UiLanguage,
} from "@src/helpers/contentLanguage";

const useLanguageControl = () => {
  const { i18n } = useTranslation();
  const currentLanguage = normalizeUiLanguage(i18n.language);

  const changeLanguage = (next: UiLanguage) => {
    if (next === currentLanguage) return;
    void i18n.changeLanguage(next);
  };

  const langLabel =
    currentLanguage === "uk" ? "UK" : currentLanguage === "ru" ? "RU" : "EN";

  return { langLabel, changeLanguage, currentLanguage };
};

export default useLanguageControl;
