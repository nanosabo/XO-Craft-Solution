import { FC, memo, useEffect, useState } from "react";

type Props = {
  id: number;
  title?: string;
};

const MarketItemImage: FC<Props> = memo(({ id, title }) => {
  const [imgSrc, setImgSrc] = useState(
    `https://crossoutcore.ru/images/items/${id}.webp`,
  );

  useEffect(() => {
    setImgSrc(`https://crossoutcore.ru/images/items/${id}.webp`);
  }, [id]);

  return (
    <img
      src={imgSrc}
      alt=""
      draggable={false}
      onError={() => setImgSrc("/question.png")}
      title={title}
    />
  );
});

export default MarketItemImage;
