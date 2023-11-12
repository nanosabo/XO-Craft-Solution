import SearchedDetail from "../SearchedDetail";
import RequiredDetailsWrapper from "./RequiredDetailsWrapper";

const RequiredDetails = () => {
  return (
    <RequiredDetailsWrapper>
      {Array(10)
        .fill(null)
        .map((_, index) => (
          <SearchedDetail key={index} />
        ))}
    </RequiredDetailsWrapper>
  );
};

export default RequiredDetails;
