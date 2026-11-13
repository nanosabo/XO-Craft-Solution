import { contentLanguage } from "@src/helpers/contentLanguage";
import { clearDroppedParts, selectLoaderState } from "@src/store/slices/loader.slice";
import { selectRequiredPartsState } from "@src/store/slices/requiredParts.slice";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import { CopyIcon, SlidersIcon } from "@src/ui/icons";
import { getPartImageUrl } from "@src/containers/Settings/types";
import classNames from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import SolvedParts from "../SolvedParts";
import SolveTotal from "../SolveTotal";
import PartsFilterModal from "./PartsFilterModal";
import RequiredPartSearch from "./RequiredPartSearch";
import styles from "./styles/SolveBlock.module.scss";

type ExportState = "idle" | "copied" | "failed";

const plain = (value: string) => value.replace(/\u00a0/g, " ");

const SolveBlock = () => {
  const { t, i18n } = useTranslation("solvePage");
  const dispatch = useAppDispatch();
  const { solvedResult, refreshing, droppedParts } = useAppSelector(
    selectLoaderState,
  );
  const { parts: requiredParts, forbidden } = useAppSelector(
    selectRequiredPartsState,
  );
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [filterOpen, setFilterOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const forbiddenNames = useMemo(
    () => new Set(forbidden.map((part) => part.eng_name)),
    [forbidden],
  );
  const filterCount = requiredParts.length + forbidden.length;

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const mark = (state: Exclude<ExportState, "idle">) => {
    setExportState(state);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setExportState("idle"), 1800);
  };

  const copyList = useCallback(async () => {
    if (!solvedResult) return;

    const stat = (
      key: "durability" | "weight" | "power" | "partsUsed",
      value: number,
    ) =>
      `${plain(t(`totals.${key}.title`))}: ${value} ${plain(t(`totals.${key}.prefix`))}`;

    const lineFor = (item: { name: string; eng_name: string; count: number }) => {
      const name = (
        contentLanguage(i18n.language) === "ru" ? item.name : item.eng_name
      ).trim();

      return t("export.line", { count: item.count, name });
    };

    const kept = solvedResult.solution.filter(
      (item) => !forbiddenNames.has(item.eng_name),
    );
    const dropped = solvedResult.solution.filter((item) =>
      forbiddenNames.has(item.eng_name),
    );

    const text = [
      plain(t("header.title")),
      stat("durability", solvedResult.totalDurability),
      stat("weight", solvedResult.totalWeight),
      stat("power", solvedResult.totalPower),
      stat("partsUsed", solvedResult.totalParts),
      "",
      ...kept.map(lineFor),
      ...(dropped.length
        ? ["", plain(t("export.removed")), ...dropped.map(lineFor)]
        : []),
      ...(droppedParts.length
        ? ["", plain(t("takeoff.title")), ...droppedParts.map(lineFor)]
        : []),
    ].join("\n");

    try {
      await window.electronAPI.copyText(text);
      mark("copied");
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        mark("copied");
      } catch {
        mark("failed");
      }
    }
  }, [droppedParts, forbiddenNames, i18n.language, solvedResult, t]);

  const exportLabel =
    exportState === "copied"
      ? t("export.copied")
      : exportState === "failed"
        ? t("export.failed")
        : t("export.action");

  return (
    <div className={styles.root}>
      <div className={styles.totals}>
        <SolveTotal />
        <AnimatePresence>
          {droppedParts.length > 0 && (
            <motion.section
              className={styles.takeoff}
              title={t("takeoff.subtitle")}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            >
              <div className={styles.takeoffText}>
                <p>{t("takeoff.title")}</p>
                <span>{t("takeoff.subtitle")}</span>
              </div>
              <div className={styles.takeoffList}>
                {droppedParts.map((part, index) => {
                  const name = (
                    contentLanguage(i18n.language) === "ru"
                      ? part.name
                      : part.eng_name
                  ).trim();

                  return (
                    <motion.div
                      key={part.id}
                      className={styles.takeoffItem}
                      title={`${part.count}× ${name}`}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.2,
                        ease: "easeOut",
                        delay: Math.min(index, 10) * 0.03,
                      }}
                    >
                      <img src={getPartImageUrl(part.id)} alt="" draggable={false} />
                      <p>{name}</p>
                      <b>{part.count}×</b>
                    </motion.div>
                  );
                })}
              </div>
              <button
                type="button"
                className={styles.takeoffHide}
                onClick={() => dispatch(clearDroppedParts())}
              >
                {t("takeoff.hide")}
              </button>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <div className={styles.parts}>
        <div className={styles.head}>
          <div className={styles.heading}>
            <h2>{t("parts.title")}</h2>
            <p className={classNames({ [styles.refreshing]: refreshing })}>
              {refreshing ? t("refreshing") : t("parts.subtitle")}
            </p>
          </div>
          <div className={styles.tools}>
            <RequiredPartSearch />
            <button
              type="button"
              className={classNames(styles.export, {
                [styles.filterOn]: filterCount > 0,
              })}
              onClick={() => setFilterOpen(true)}
            >
              <SlidersIcon />
              {t("filter.action")}
              {filterCount > 0 && (
                <span className={styles.filterCount}>{filterCount}</span>
              )}
            </button>
            <button
              type="button"
              className={classNames(styles.export, {
                [styles.exportDone]: exportState === "copied",
                [styles.exportFailed]: exportState === "failed",
              })}
              title={t("export.hint")}
              disabled={!solvedResult || solvedResult.solution.length === 0}
              onClick={() => void copyList()}
            >
              <CopyIcon />
              {exportLabel}
            </button>
          </div>
        </div>

        <SolvedParts />
      </div>

      <AnimatePresence>
        {filterOpen && (
          <PartsFilterModal onClose={() => setFilterOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SolveBlock;
