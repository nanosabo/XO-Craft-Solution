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
import { FetchedData, updateMarket } from "@src/store/slices/market.slice";

const Header = () => {
  const location = useLocation();
  const isLoadingPage = location.pathname === "/loading";

  const dispatch = useAppDispatch();

  useEffect(() => {
    const listener = (_: Electron.IpcRendererEvent, data: FetchedData) => {
      dispatch(updateMarket(data));
    };

    window.ipcRenderer.on("update", listener);

    return () => {
      window.ipcRenderer.removeListener("from-main", listener);
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
