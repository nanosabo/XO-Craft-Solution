import useLanguageControl from "@src/hooks/useLanguageControl";
import { useEffect, useState } from "react";
import styles from "./styles/SwitchLanguageButton.module.scss";
import { useTranslation } from "react-i18next";

const SwitchLanguageButton = () => {
  const [isDisabled, setIsDisabled] = useState(false);

  const { langLabel, handleChangeLanguage, currentLanguage } =
    useLanguageControl();

  const { t } = useTranslation("navigation");

  useEffect(() => {
    setIsDisabled(true);
    const timer = setTimeout(() => setIsDisabled(false), 1200);

    return () => {
      clearTimeout(timer);
    };
  }, [currentLanguage]);

  return (
    <button
      type="button"
      className={styles.root}
      onClick={handleChangeLanguage}
      disabled={isDisabled}
      title={t("lang")}
    >
      {langLabel}
    </button>
  );
};

export default SwitchLanguageButton;
