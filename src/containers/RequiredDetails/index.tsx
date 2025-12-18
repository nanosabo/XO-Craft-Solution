import { useAppSelector } from "@src/store/store";
import SearchedDetail from "../SearchedDetail";
import RequiredDetailsWrapper from "./RequiredDetailsWrapper";
import { selectRequiredPartsState } from "@src/store/slices/requiredParts.slice";

const RequiredDetails = () => {
  const { parts } = useAppSelector(selectRequiredPartsState);
  return (
    <RequiredDetailsWrapper>
      {parts.map((item) => (
        <SearchedDetail
          key={item.id}
          name={item.name}
          eng_name={item.eng_name}
          id={item.id}
          count={item.count}
          max={item.maxCount}
        />
      ))}
    </RequiredDetailsWrapper>
  );
};

export default RequiredDetails;
