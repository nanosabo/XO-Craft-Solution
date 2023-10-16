import useLanguageControl from "@src/hooks/useLanguageControl";
import SquareButton from "@src/ui/SquareButton";
import { AnimatePresence, motion } from "framer-motion";
import { SwitchLangAnimation } from "./animation";
import { useEffect, useState } from "react";

const SwitchLanguageButton = () => {
  const [isDisabled, setIsDisabled] = useState(false);

  const { CurrentLanguageIcon, handleChangeLanguage, currentLanguage } =
    useLanguageControl();

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
          key={currentLanguage}
          variants={SwitchLangAnimation}
          initial="initial"
          animate="animate"
          exit="initial"
        >
          <CurrentLanguageIcon />
        </motion.div>
      </AnimatePresence>
    </SquareButton>
  );
};

export default SwitchLanguageButton;
