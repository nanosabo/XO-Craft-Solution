import useLanguageControl from "@src/hooks/useLanguageControl";
import SquareButton from "@src/ui/SquareButton";
import { AnimatePresence, motion } from "framer-motion";
import { SwitchLangAnimation } from "./animation";
import { useEffect, useState } from "react";
import styles from "./styles/SwitchLanguageButton.module.scss";
import { useTranslation } from "react-i18next";

const SwitchLanguageButton = () => {
  const [isDisabled, setIsDisabled] = useState(false);

  const { nextLang, handleChangeLanguage, currentLanguage } =
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
    <SquareButton onClick={handleChangeLanguage} disabled={isDisabled}>
      <AnimatePresence initial={false}>
        <motion.div
          className={styles.root}
          key={currentLanguage}
          variants={SwitchLangAnimation}
          initial="initial"
          animate="animate"
          exit="initial"
          title={t("lang")}
        >
          {nextLang}
        </motion.div>
      </AnimatePresence>
    </SquareButton>
  );
};

export default SwitchLanguageButton;
