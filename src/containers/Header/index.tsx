import AppLogo from "@src/components/AppLogo";
import Navigation from "@src/components/Navigation";
import WindowActions from "../WindowActions";
import { useLocation } from "react-router-dom";
import styles from "./styles/Header.module.scss";
import HeaderButtons from "@src/components/HeaderButtons";
import { AnimatePresence, motion } from "framer-motion";
import { headerAnimation } from "./animation";
import { useAppDispatch } from "@src/store/store";
import { useEffect } from "react";
import {
  fetchData,
  IItemAnalytics,
  updateMarket,
} from "@src/store/slices/market.slice";
import i18n from "../../i18n";

const Header = () => {
  const location = useLocation();
  const isLoadingPage = location.pathname === "/loading";

  const dispatch = useAppDispatch();

  useEffect(() => {
    const listener = (
      _: Electron.IpcRendererEvent,
      { items }: { items: IItemAnalytics[] },
    ) => {
      dispatch(updateMarket(items));
    };

    const langListener = () => {
      dispatch(fetchData(null));
    };

    i18n.on("languageChanged", langListener);
    window.ipcRenderer.on("update", listener);

    return () => {
      window.ipcRenderer.removeListener("update", listener);
      i18n.off("languageChanged", langListener);
    };
  }, [dispatch]);

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
