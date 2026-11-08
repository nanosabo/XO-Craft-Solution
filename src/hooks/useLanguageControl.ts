import { useTranslation } from "react-i18next";

const useLanguageControl = () => {
  const { i18n } = useTranslation();

  const currentLanguage = i18n.language;

  const handleChangeLanguage = () => {
    i18n.changeLanguage(currentLanguage === "ru" ? "en" : "ru");
  };

  const langLabel = currentLanguage === "ru" ? "RU" : "EN";

  return { langLabel, handleChangeLanguage, currentLanguage };
};

export default useLanguageControl;
