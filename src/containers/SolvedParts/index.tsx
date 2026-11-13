import PartItem from "@src/components/PartItem";
import { contentLanguage } from "@src/helpers/contentLanguage";
import {
  cancelScheduledSolutionRefresh,
  scheduleSolutionRefresh,
} from "@src/helpers/scheduleSolutionRefresh";
import {
  forgetRemovedPart,
  noteRemovedPart,
  selectLoaderState,
  setInstalledCount,
  setInstalledParts,
  setSolvedResult,
  solvedPart,
  toggleInstalledPart,
} from "@src/store/slices/loader.slice";
import {
  returnPart,
  selectRequiredPartsState,
} from "@src/store/slices/requiredParts.slice";
import { selectSolveInputsState } from "@src/store/slices/solveInputs.slice";
import { store, useAppDispatch, useAppSelector } from "@src/store/store";
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
  const { solvedResult, installedParts } = useAppSelector(selectLoaderState);
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
  const installedIds = useMemo(
    () => new Set(installedParts.map((part) => part.id)),
    [installedParts],
  );
  const installedCounts = useMemo(
    () => new Map(installedParts.map((part) => [part.id, part.count])),
    [installedParts],
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
      const { explicitlyRemoved, removalSnapshot } = store.getState().loader;
      const othersRemain = explicitlyRemoved.some((part) => part.id !== id);

      cancelScheduledSolutionRefresh();
      dispatch(returnPart(id));
      dispatch(forgetRemovedPart(id));
      setRemoved((current) => current.filter((part) => part.id !== id));

      if (othersRemain || !removalSnapshot) {
        scheduleSolutionRefresh(dispatch);
      }
    },
    [dispatch],
  );

  const clearRemoved = () => setRemoved([]);

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

      if (installedParts.some((part) => part.id === analogPart.id)) {
        const carried = new Set([analog.id]);
        const kept = installedParts.filter(
          (part) => part.id !== analogPart.id && !carried.has(part.id),
        );
        const moved = next.solution.flatMap((part) =>
          carried.has(part.id)
            ? [
                {
                  id: part.id,
                  name: part.name,
                  eng_name: part.eng_name,
                  count: part.count,
                },
              ]
            : [],
        );

        dispatch(setInstalledParts([...kept, ...moved]));
      }

      dispatch(setSolvedResult(next));
      setAnalogPart(null);
    },
    [analogPart, dispatch, inputs, installedParts, solvedResult],
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

      const target = solvedResult.solution.find((part) => part.id === targetId);

      if (target && installedParts.some((part) => part.id === targetId)) {
        const carried = new Set([
          targetId,
          ...(target.origins ?? []).map((origin) => origin.id),
        ]);
        const kept = installedParts.filter((part) => !carried.has(part.id));
        const moved = next.solution.flatMap((part) =>
          carried.has(part.id)
            ? [
                {
                  id: part.id,
                  name: part.name,
                  eng_name: part.eng_name,
                  count: part.count,
                },
              ]
            : [],
        );

        dispatch(setInstalledParts([...kept, ...moved]));
      }

      dispatch(setSolvedResult(next));
    },
    [dispatch, inputs, installedParts, parts, solvedResult],
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
    <div className={styles.stage}>
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
          <button
            type="button"
            className={styles.undoClear}
            onClick={clearRemoved}
          >
            {t("undo.clear")}
          </button>
        </div>
      )}

      <SolvedPartsWrapper>
          {orderedSolution.map((item) => {
            const isForbidden = forbiddenNames.has(item.eng_name);

            const replacedNames = item.origins?.map((origin) => {
              const name = (
                contentLanguage(i18n.language) === "ru"
                  ? origin.name
                  : origin.eng_name
              ).trim();

              return origin.count > 1 ? `${origin.count}× ${name}` : name;
            });

            return (
              <PartItem
                key={item.id}
                {...item}
                isForbidden={isForbidden}
                isRequired={requiredIds.has(item.id)}
                isInstalled={installedIds.has(item.id)}
                installedCount={installedCounts.get(item.id)}
                onInstalledCount={(next) =>
                  dispatch(
                    setInstalledCount({
                      id: item.id,
                      count: next,
                      full: next >= item.count,
                    }),
                  )
                }
                onToggleInstalled={() =>
                  dispatch(
                    toggleInstalledPart({
                      id: item.id,
                      name: item.name,
                      eng_name: item.eng_name,
                      count: item.count,
                    }),
                  )
                }
                isReplaced={Boolean(replacedNames?.length)}
                replacedTitle={
                  replacedNames?.length
                    ? t("replaced.title", { names: replacedNames.join(", ") })
                    : undefined
                }
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
    </div>
  );
};

export default SolvedParts;
