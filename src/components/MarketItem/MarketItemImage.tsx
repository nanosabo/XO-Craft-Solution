import { FC, memo, useEffect, useMemo, useState } from "react";

type Props = {
  id: number;
  title?: string;
};

const MarketItemImage: FC<Props> = memo(({ id, title }) => {
  const sources = useMemo(
    () => [
      `https://crossoutcore.ru/images/items/${id}.webp`,
      `https://nanosabo.github.io/xocs-imgs/images/items/${id}.webp`,
      "question.png",
    ],
    [id],
  );

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [id]);

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
