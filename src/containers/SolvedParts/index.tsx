import PartItem from "@src/components/PartItem";
import { selectLoaderState } from "@src/store/slices/loader.slice";
import { useAppSelector } from "@src/store/store";
import SolvedPartsWrapper from "./SolvedPartsWrapper";

const SolvedParts = () => {
  const { solvedResult } = useAppSelector(selectLoaderState);

  if (solvedResult === null) return null;

  return (
    <SolvedPartsWrapper>
      {solvedResult.solution.map((item) => (
        <PartItem key={item.id} {...item} />
      ))}
    </SolvedPartsWrapper>
  );
};

export default SolvedParts;
