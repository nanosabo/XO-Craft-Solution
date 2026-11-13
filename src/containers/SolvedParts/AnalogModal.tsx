import useScrollFade from "@src/hooks/useScrollFade";
import classNames from "classnames";
import { motion } from "framer-motion";
import { FC, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { solvedPart } from "@src/store/slices/loader.slice";
import { selectSettingsState } from "@src/store/slices/settings.slice";
import { useAppSelector } from "@src/store/store";
import { CloseIcon } from "@src/ui/icons";
import { getAnalogMatches, getSizeMatches, formatDelta, hasPartSize } from "../Settings/analog/helpers";
import PartImage from "../Settings/components/PartImage";
import PartStats from "../Settings/components/PartStats";
import { contentLanguage } from "@src/helpers/contentLanguage";
import { formatPartSize } from "@electron/partSearch";
import { getPartName, Part } from "../Settings/types";
import useParts from "../Settings/useParts";
import styles from "./styles/AnalogModal.module.scss";

interface Props {
  source: solvedPart;
  solution: solvedPart[];
  forbiddenIds: Set<string>;
  forbiddenNames: Set<string>;
  onClose: () => void;
  onReplace: (part: Part, parts: Part[]) => void;
}

const AnalogModal: FC<Props> = ({
  source,
  solution,
  forbiddenIds,
  forbiddenNames,
  onClose,
  onReplace,
}) => {
  const { t, i18n } = useTranslation("solvePage");
  const { analog, inventory, inventoryEnabled } = useAppSelector(
    selectSettingsState,
  );
  const { parts, isLoading, error } = useParts();
  const titleId = useId();
  const [mode, setMode] = useState<"stats" | "size">("stats");
  const [listElement, setListElement] = useState<HTMLDivElement | null>(null);
  const listRef = useMemo(() => ({ current: listElement }), [listElement]);
  const fade = useScrollFade(listRef);

  const sourcePart = useMemo(
    () => parts.find((part) => part.id === source.id) ?? null,
    [parts, source.id],
  );

  const solutionCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const item of solution) {
      counts.set(item.id, item.count);
    }

    return counts;
  }, [solution]);

  const matches = useMemo(() => {
    if (!sourcePart) return [];

    const found =
      mode === "size"
        ? getSizeMatches(parts, sourcePart)
        : getAnalogMatches(parts, sourcePart, analog);

    return found.filter(({ part }) => {
      if (forbiddenIds.has(part.id) || forbiddenNames.has(part.eng_name)) {
        return false;
      }

      const owned =
        inventoryEnabled &&
        Object.prototype.hasOwnProperty.call(inventory, part.id)
          ? Math.max(0, inventory[part.id] ?? 0)
          : part.maxCount;
      const limit = Math.min(part.maxCount, owned);
      const needed = source.count + (solutionCounts.get(part.id) ?? 0);

      return limit >= needed;
    });
  }, [
    analog,
    forbiddenIds,
    forbiddenNames,
    inventory,
    inventoryEnabled,
    mode,
    parts,
    solutionCounts,
    source.count,
    sourcePart,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const sourceName =
    contentLanguage(i18n.language) === "ru" ? source.name : source.eng_name;

  return createPortal(
    <motion.div
      className={styles.root}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        className={styles.container}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.18 }}
      >
        <div className={styles.header}>
          <div>
            <h3 id={titleId}>{t("similar.title")}</h3>
            <p>{t("similar.subtitle")}</p>
          </div>

          <button
            type="button"
            className={styles.close}
            title={t("similar.close")}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            className={classNames(styles.tab, {
              [styles.tabOn]: mode === "stats",
            })}
            onClick={() => setMode("stats")}
          >
            {t("similar.byStats")}
          </button>
          <button
            type="button"
            className={classNames(styles.tab, {
              [styles.tabOn]: mode === "size",
            })}
            onClick={() => setMode("size")}
          >
            {t("similar.bySize")}
          </button>
        </div>

        <div className={styles.current}>
          <PartImage id={source.id} />

          <div className={styles.currentInfo}>
            <span className={styles.label}>{t("similar.current")}</span>
            <p>
              {sourcePart
                ? getPartName(sourcePart, i18n.language)
                : sourceName}
            </p>
            {sourcePart && <PartStats part={sourcePart} />}
            {sourcePart && formatPartSize(sourcePart) && (
              <span className={styles.sizeLabel}>
                {formatPartSize(sourcePart)}
              </span>
            )}
          </div>

          <span className={styles.count}>
            {source.count} {t("totals.partsUsed.prefix")}
          </span>
        </div>

        {mode === "stats" && (
          <p className={styles.tolerances}>
            {t("similar.tolerances", {
              power: analog.power,
              weight: analog.weight,
              durability: analog.durability,
            })}
          </p>
        )}

        {!isLoading && !error && sourcePart && (
          <div className={styles.listHeader}>
            <p>{t("similar.matches", { count: matches.length })}</p>
            <span>
              {mode === "size"
                ? sourcePart && hasPartSize(sourcePart)
                  ? t("similar.sameSize")
                  : t("similar.noSize")
                : t("similar.sameCategory")}
            </span>
          </div>
        )}

        {error ? (
          <p className={styles.state}>{t("similar.error")}</p>
        ) : isLoading ? (
          <p className={styles.state}>{t("similar.loading")}</p>
        ) : !sourcePart ? (
          <p className={styles.state}>{t("similar.notFound")}</p>
        ) : matches.length === 0 ? (
          <p className={styles.state}>
            {mode === "size" && sourcePart && !hasPartSize(sourcePart)
              ? t("similar.noSize")
              : t("similar.noMatches")}
          </p>
        ) : (
          <div
            ref={setListElement}
            className={classNames(styles.list, {
              [styles.fadeTop]: fade.top,
              [styles.fadeBottom]: fade.bottom,
            })}
          >
            {matches.map(
              ({ part, powerDelta, weightDelta, durabilityDelta }) => {
                const name = getPartName(part, i18n.language);

                return (
                  <div key={part.id} className={styles.row}>
                    <PartImage id={part.id} />

                    <div className={styles.rowInfo}>
                      <p title={name}>{name}</p>
                      <PartStats part={part} />
                      {mode === "size" && formatPartSize(part) && (
                        <span className={styles.sizeLabel}>
                          {formatPartSize(part)}
                        </span>
                      )}
                    </div>

                    <div className={styles.deltas}>
                      <span
                        className={classNames(styles.delta, {
                          [styles.deltaGood]: powerDelta <= 0,
                          [styles.deltaBad]: powerDelta > 0,
                        })}
                      >
                        {formatDelta(
                          powerDelta,
                          t("totals.power.prefix"),
                        )}
                      </span>
                      <span
                        className={classNames(styles.delta, {
                          [styles.deltaGood]: weightDelta <= 0,
                          [styles.deltaBad]: weightDelta > 0,
                        })}
                      >
                        {formatDelta(
                          weightDelta,
                          t("totals.weight.prefix"),
                        )}
                      </span>
                      <span
                        className={classNames(styles.delta, {
                          [styles.deltaGood]: durabilityDelta >= 0,
                          [styles.deltaBad]: durabilityDelta < 0,
                        })}
                      >
                        {formatDelta(
                          durabilityDelta,
                          t("totals.durability.prefix"),
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      className={styles.replace}
                      onClick={() => onReplace(part, parts)}
                    >
                      {t("similar.replace")}
                    </button>
                  </div>
                );
              },
            )}
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body,
  );
};

export default AnalogModal;
