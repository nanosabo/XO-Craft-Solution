import PartItem from "@src/components/PartItem";
import { selectLoaderState } from "@src/store/slices/loader.slice";
import { useAppSelector } from "@src/store/store";
import SolvedPartsWrapper from "./SolvedPartsWrapper";
import { selectRequiredPartsState } from "@src/store/slices/requiredParts.slice";

const SolvedParts = () => {
  const { solvedResult } = useAppSelector(selectLoaderState);
  const { forbidden } = useAppSelector(selectRequiredPartsState);
  const forbiddenNames = forbidden.map((p) => p.eng_name);

  if (solvedResult === null) return null;

  return (
    <SolvedPartsWrapper>
      {solvedResult.solution.map((item) => (
        <PartItem
          key={item.id}
          isForbidden={forbiddenNames.includes(item.eng_name)}
          {...item}
        />
      ))}
    </SolvedPartsWrapper>
  );
};

export default SolvedParts;
