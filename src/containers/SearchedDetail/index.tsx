import DetailSearchPicture from "@src/components/DetailSearchPicture";
import SquareSmallButton from "@src/ui/SquareSmallButton";
import { useState } from "react";
import styles from "./styles/SearchedDetail.module.scss";

const SearchedDetail = () => {
  const [count, setCount] = useState(1);

  const handleIncrement = () => setCount((prev) => prev + 1);

  const handleDecrement = () =>
    setCount((prev) => (prev < 2 ? prev : prev - 1));

  return (
    <div className={styles.wrapper}>
      <div className={styles.info}>
        <DetailSearchPicture src="/details/Fender.webp" alt="Крыло" />
        <p>Крыло</p>
      </div>

      <div className={styles.controls}>
        <SquareSmallButton variant="white" onClick={handleDecrement}>
          -
        </SquareSmallButton>

        <span>{count}</span>

        <SquareSmallButton variant="primary" onClick={handleIncrement}>
          +
        </SquareSmallButton>
      </div>
    </div>
  );
};

export default SearchedDetail;
