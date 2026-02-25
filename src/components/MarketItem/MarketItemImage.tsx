import { selectMarketState } from "@src/store/slices/market.slice";
import { useAppSelector } from "@src/store/store";
import { FC, memo, useEffect, useMemo, useState } from "react";

type Props = {
  id: number;
  title?: string;
};

const MarketItemImage: FC<Props> = memo(({ id, title }) => {
  const [index, setIndex] = useState(0);
  const { isMirror } = useAppSelector(selectMarketState);

  useEffect(() => {
    setIndex(0);
  }, [id, isMirror]);

  const sources = useMemo(() => {
    const mirrorSource = `https://nanosabo.github.io/xocs-imgs/images/items/${id}.webp`;
    const mainSource = `https://crossoutcore.ru/images/items/${id}.webp`;

    return isMirror
      ? [mirrorSource, "question.png"]
      : [mainSource, mirrorSource, "question.png"];
  }, [id, isMirror]);

  const handleError = () => {
    setIndex((prev) => (prev < sources.length - 1 ? prev + 1 : prev));
  };

  return (
    <img
      src={sources[index]}
      alt={title ?? ""}
      draggable={false}
      onError={handleError}
      title={title}
    />
  );
});

export default MarketItemImage;
