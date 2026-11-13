import PartItem from "@src/components/PartItem";
import { contentLanguage } from "@src/helpers/contentLanguage";
import { scheduleSolutionRefresh } from "@src/helpers/scheduleSolutionRefresh";
import {
  clearDroppedParts,
  forgetRemovedPart,
  noteRemovedPart,
  selectLoaderState,
  setSolvedResult,
  solvedPart,
} from "@src/store/slices/loader.slice";
import {
  returnPart,
  selectRequiredPartsState,
} from "@src/store/slices/requiredParts.slice";
import { selectSolveInputsState } from "@src/store/slices/solveInputs.slice";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getPartImageUrl, Part } from "../Settings/types";
import useParts from "../Settings/useParts";
import AnalogModal from "./AnalogModal";
import { replaceSolutionPart, restoreOriginalParts } from "./helpers";
import SolvedPartsWrapper from "./SolvedPartsWrapper";
import styles from "./styles/SolvedParts.module.scss";

const REMOVED_TTL = 20000;

interface RemovedPart extends solvedPart {
  until: number;
}

const SolvedParts = () => {
  const { t, i18n } = useTranslation("solvePage");
  const { solvedResult, droppedParts } = useAppSelector(selectLoaderState);
  const { parts: requiredParts, forbidden } = useAppSelector(
    selectRequiredPartsState,
  );
  const inputs = useAppSelector(selectSolveInputsState);
  const { parts } = useParts();
  const dispatch = useAppDispatch();

  const [analogPart, setAnalogPart] = useState<solvedPart | null>(null);
  const [removed, setRemoved] = useState<RemovedPart[]>([]);
  const [trayOpen, setTrayOpen] = useState(false);
  const removedRef = useRef(removed);
  removedRef.current = removed;

  const requiredIds = useMemo(
    () => new Set(requiredParts.map((part) => part.id)),
    [requiredParts],
  );
  const forbiddenIds = useMemo(
    () => new Set(forbidden.map((part) => part.id)),
    [forbidden],
  );
  const forbiddenNames = useMemo(
    () => new Set(forbidden.map((part) => part.eng_name)),
    [forbidden],
  );

  useEffect(() => {
    if (!solvedResult) setAnalogPart(null);
  }, [solvedResult]);

  useEffect(() => {
    setRemoved((current) => {
      const next = current.filter(
        (part) =>
          forbiddenIds.has(part.id) || forbiddenNames.has(part.eng_name),
      );

      return next.length === current.length ? current : next;
    });
  }, [forbiddenIds, forbiddenNames]);

  useEffect(() => {
    if (removed.length > 0) setTrayOpen(true);
  }, [removed.length]);

  useEffect(() => {
    if (removed.length === 0) return;

    const nearest = Math.min(...removed.map((part) => part.until));
    const timer = window.setTimeout(() => {
      setRemoved((current) =>
        current.filter((part) => part.until > Date.now()),
      );
    }, Math.max(0, nearest - Date.now()));

    return () => window.clearTimeout(timer);
  }, [removed]);

  const rememberRemoved = useCallback((part: solvedPart) => {
    dispatch(
      noteRemovedPart({
        id: part.id,
        name: part.name,
        eng_name: part.eng_name,
        count: part.count,
      }),
    );
    setRemoved((current) => [
      { ...part, until: Date.now() + REMOVED_TTL },
      ...current.filter((item) => item.id !== part.id),
    ]);
  }, [dispatch]);

  const undoRemoved = useCallback(
    (id: string) => {
      dispatch(returnPart(id));
      dispatch(forgetRemovedPart(id));
      setRemoved((current) => current.filter((part) => part.id !== id));
      scheduleSolutionRefresh(dispatch);
    },
    [dispatch],
  );

  const onCloseAnalogs = useCallback(() => setAnalogPart(null), []);

  const onReplace = useCallback(
    (analog: Part, parts: Part[]) => {
      if (!analogPart || !solvedResult) return;

      const next = replaceSolutionPart({
        result: solvedResult,
        sourceId: analogPart.id,
        analog,
        parts,
        inputs,
      });

      dispatch(setSolvedResult(next));
      setAnalogPart(null);
    },
    [analogPart, dispatch, inputs, solvedResult],
  );

  const onRestoreOriginal = useCallback(
    (targetId: string) => {
      if (!solvedResult || parts.length === 0) return;

      const next = restoreOriginalParts({
        result: solvedResult,
        targetId,
        parts,
        inputs,
      });

      dispatch(setSolvedResult(next));
    },
    [dispatch, inputs, parts, solvedResult],
  );

  const orderedSolution = useMemo(() => {
    if (!solvedResult) return [];

    const required = new Map(
      solvedResult.solution
        .filter((part) => requiredIds.has(part.id))
        .map((part) => [part.id, part]),
    );
    const pinned = requiredParts.flatMap((part) => {
      const item = required.get(part.id);
      return item ? [item] : [];
    });
    const rest = solvedResult.solution.filter(
      (part) => !requiredIds.has(part.id),
    );

    return [...pinned, ...rest];
  }, [requiredIds, requiredParts, solvedResult]);

  if (solvedResult === null) return null;

  const partLabel = (part: solvedPart) =>
    (contentLanguage(i18n.language) === "ru" ? part.name : part.eng_name).trim();

  return (
    <>
      <AnimatePresence>
        {droppedParts.length > 0 && (
          <motion.section
            className={styles.takeoff}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <div className={styles.takeoffHead}>
              <div>
                <p>{t("takeoff.title")}</p>
                <span>{t("takeoff.subtitle")}</span>
              </div>
              <button
                type="button"
                className={styles.takeoffHide}
                onClick={() => dispatch(clearDroppedParts())}
              >
                {t("takeoff.hide")}
              </button>
            </div>
            <div className={styles.takeoffList}>
              {droppedParts.map((part, index) => {
                const name = partLabel(part);

                return (
                  <motion.div
                    key={part.id}
                    className={styles.takeoffItem}
                    title={`${part.count}× ${name}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.2,
                      ease: "easeOut",
                      delay: Math.min(index, 10) * 0.035,
                    }}
                  >
                    <img
                      src={getPartImageUrl(part.id)}
                      alt=""
                      draggable={false}
                    />
                    <p>{name}</p>
                    <b>{part.count}×</b>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {trayOpen && (
        <div className={styles.undo}>
          <span className={styles.undoLabel}>{t("undo.label")}</span>
          <div className={styles.undoList}>
            <AnimatePresence
              onExitComplete={() => {
                if (removedRef.current.length === 0) setTrayOpen(false);
              }}
            >
              {removed.map((part) => {
                const name = partLabel(part);

                return (
                  <motion.div
                    key={part.id}
                    className={styles.chip}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                  >
                    <span
                      className={styles.timer}
                      style={{ animationDuration: `${REMOVED_TTL}ms` }}
                    />
                    <img
                      src={getPartImageUrl(part.id)}
                      alt=""
                      draggable={false}
                    />
                    <p title={name}>
                      {part.count > 1 ? `${part.count}× ${name}` : name}
                    </p>
                    <button
                      type="button"
                      className={styles.undoButton}
                      onClick={() => undoRemoved(part.id)}
                    >
                      {t("undo.action")}
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      <SolvedPartsWrapper>
        {orderedSolution.map((item) => {
          const isForbidden = forbiddenNames.has(item.eng_name);

          return (
            <PartItem
              key={item.id}
              {...item}
              isForbidden={isForbidden}
              isRequired={requiredIds.has(item.id)}
              onShowAnalogs={
                isForbidden ? undefined : () => setAnalogPart(item)
              }
              onRestoreOriginal={
                !isForbidden && item.origins?.length && parts.length > 0
                  ? () => onRestoreOriginal(item.id)
                  : undefined
              }
              onExcluded={
                isForbidden ? undefined : () => rememberRemoved(item)
              }
            />
          );
        })}
      </SolvedPartsWrapper>

      <AnimatePresence>
        {analogPart && (
          <AnalogModal
            key={analogPart.id}
            source={analogPart}
            solution={solvedResult.solution}
            forbiddenIds={forbiddenIds}
            forbiddenNames={forbiddenNames}
            onClose={onCloseAnalogs}
            onReplace={onReplace}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default SolvedParts;
