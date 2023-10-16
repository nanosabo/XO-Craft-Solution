import { EngIcon, RuIcon } from "@src/ui/icons";
import { useTranslation } from "react-i18next";

type LangIcon = {
  [key: string]: () => JSX.Element;
};

const LanguageIcon: LangIcon = {
  ru: RuIcon,
  en: EngIcon,
};

const useLanguageControl = () => {
  const { i18n } = useTranslation();

  const currentLanguage = i18n.language;

  const handleChangeLanguage = () => {
    i18n.changeLanguage(currentLanguage === "ru" ? "en" : "ru");
  };

  const CurrentLanguageIcon = LanguageIcon[currentLanguage] ?? LanguageIcon.en;

  return { CurrentLanguageIcon, handleChangeLanguage, currentLanguage };
};

export default useLanguageControl;
