import MarketModalTop from "@src/components/MarketModalTop";
import styles from "./styles/MarketModal.module.scss";
import MarketModalBottom from "@src/components/MarketModalBottom";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import {
  closeMarketModal,
  selectMarketModalState,
  setMarketModalCalc,
} from "@src/store/slices/marketModal.slice";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { ISolveResult } from "@electron/oneItemCalc";
import MarketModalChart from "../MarketModalChart";

const blocks = {
  craft: <MarketModalBottom />,
  own: <></>,
  chart: <MarketModalChart />,
};

const MarketModal = () => {
  const { open, show } = useAppSelector(selectMarketModalState);
  const dispatch = useAppDispatch();

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        dispatch(closeMarketModal());
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, dispatch]);

  useEffect(() => {
    const listener = (_: Electron.IpcRendererEvent, data: ISolveResult) => {
      dispatch(setMarketModalCalc(data));
    };

    window.ipcRenderer.on("updateCraft", listener);

    return () => {
      window.ipcRenderer.removeListener("updateCraft", listener);
    };
  }, [dispatch]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.root}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
        >
          <div ref={containerRef} className={styles.container}>
            <MarketModalTop />
            {blocks[show]}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MarketModal;
