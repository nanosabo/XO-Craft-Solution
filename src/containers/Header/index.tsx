import AppLogo from "@src/components/AppLogo";
import Navigation from "@src/components/Navigation";
import { useLocation } from "react-router-dom";
import styles from "./styles/Header.module.scss";
import HeaderButtons from "@src/components/HeaderButtons";
import { AnimatePresence, motion } from "framer-motion";
import { headerAnimation } from "./animation";
import { useAppDispatch } from "@src/store/store";
import { logWarning } from "@src/helpers/errorLog";
import { useEffect } from "react";
import {
  fetchData,
  IItemAnalytics,
  setIsMirror,
  updateMarket,
} from "@src/store/slices/market.slice";
import i18n from "../../i18n";
import useAutoUpdate from "@src/hooks/useAutoUpdate";
import useMarketNotifications from "@src/hooks/useMarketNotifications";

const Header = () => {
  const location = useLocation();
  const isLoadingPage = location.pathname === "/loading";

  const dispatch = useAppDispatch();

  useAutoUpdate();
  useMarketNotifications();

  useEffect(() => {
    const listener = (
      _: Electron.IpcRendererEvent,
      { items }: { items: IItemAnalytics[] },
    ) => {
      dispatch(updateMarket(items));
    };

    const langListener = () => {
      void dispatch(fetchData(null)).catch(() => undefined);
    };

    const mirrorListener = (
      _: Electron.IpcRendererEvent,
      isMirror: boolean,
    ) => {
      dispatch(setIsMirror(isMirror));
    };

    window.electronAPI
      .getIsMirror()
      .then((isMirr) => dispatch(setIsMirror(isMirr)))
      .catch((error) => logWarning("mirror", error));

    i18n.on("languageChanged", langListener);
    window.ipcRenderer.on("update", listener);
    window.ipcRenderer.on("setMirror", mirrorListener);

    return () => {
      window.ipcRenderer.removeListener("update", listener);
      window.ipcRenderer.removeListener("setMirror", mirrorListener);
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
    </header>
  );
};

export default Header;
