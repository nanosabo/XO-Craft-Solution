import PartItem from "@src/components/PartItem";
import {
  selectLoaderState,
  setSolvedResult,
  solvedPart,
} from "@src/store/slices/loader.slice";
import { selectRequiredPartsState } from "@src/store/slices/requiredParts.slice";
import { selectSolveInputsState } from "@src/store/slices/solveInputs.slice";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Part } from "../Settings/types";
import useParts from "../Settings/useParts";
import AnalogModal from "./AnalogModal";
import { replaceSolutionPart, restoreOriginalParts } from "./helpers";
import SolvedPartsWrapper from "./SolvedPartsWrapper";

const SolvedParts = () => {
  const { solvedResult } = useAppSelector(selectLoaderState);
  const { forbidden } = useAppSelector(selectRequiredPartsState);
  const inputs = useAppSelector(selectSolveInputsState);
  const { parts } = useParts();
  const dispatch = useAppDispatch();

  const [analogPart, setAnalogPart] = useState<solvedPart | null>(null);

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

  if (solvedResult === null) return null;

  return (
    <>
      <SolvedPartsWrapper>
        {solvedResult.solution.map((item) => {
          const isForbidden = forbiddenNames.has(item.eng_name);

          return (
            <PartItem
              key={item.id}
              isForbidden={isForbidden}
              onShowAnalogs={
                isForbidden ? undefined : () => setAnalogPart(item)
              }
              onRestoreOriginal={
                !isForbidden && item.origins?.length && parts.length > 0
                  ? () => onRestoreOriginal(item.id)
                  : undefined
              }
              {...item}
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
