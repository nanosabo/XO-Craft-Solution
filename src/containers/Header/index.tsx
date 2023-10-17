import AppLogo from "@src/components/AppLogo";
import Navigation from "@src/components/Navigation";
import WindowActions from "../WindowActions";
import { useLocation } from "react-router-dom";
import styles from "./styles/Header.module.scss";
import HeaderButtons from "@src/components/HeaderButtons";
import { AnimatePresence, motion } from "framer-motion";
import { headerAnimation } from "./animation";

const Header = () => {
  const location = useLocation();
  const isLoadingPage = location.pathname === "/loading";

  return (
    <header className={styles.header}>
      <AnimatePresence>
        {!isLoadingPage && (
          <motion.span
            variants={headerAnimation}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <AppLogo />
            <Navigation />
            <HeaderButtons />
          </motion.span>
        )}
      </AnimatePresence>

      <WindowActions />
    </header>
  );
};

export default Header;
