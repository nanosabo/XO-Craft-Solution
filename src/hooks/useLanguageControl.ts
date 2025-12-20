import { useTranslation } from "react-i18next";

const useLanguageControl = () => {
  const { i18n } = useTranslation();

  const currentLanguage = i18n.language;

  const handleChangeLanguage = () => {
    i18n.changeLanguage(currentLanguage === "ru" ? "en" : "ru");
  };

  const nextLang = currentLanguage === "ru" ? "ENG" : "RU";

  return { nextLang, handleChangeLanguage, currentLanguage };
};

export default useLanguageControl;
