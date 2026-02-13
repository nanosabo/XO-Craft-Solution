import { FC, memo, useState } from "react";

type Props = {
  id: number;
};

const MarketItemImage: FC<Props> = memo(({ id }) => {
  const [imgSrc, setImgSrc] = useState(
    `https://crossoutcore.ru/images/items/${id}.png`,
  );

  return (
    <img
      src={imgSrc}
      alt=""
      draggable={false}
      onError={() => setImgSrc("/question.png")}
    />
  );
});

export default MarketItemImage;
