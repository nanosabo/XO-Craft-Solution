import MarketSectionFilter from "../MarketSectionFilter";
import Input from "@src/ui/Input";

const MarketSearch = () => {
  return (
    <MarketSectionFilter title="Поиск">
      <Input type="search" />
    </MarketSectionFilter>
  );
};

export default MarketSearch;
