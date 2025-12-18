import DetailSearchPicture from "@src/components/DetailSearchPicture";
import SquareSmallButton from "@src/ui/SquareSmallButton";
import { FC } from "react";
import styles from "./styles/SearchedDetail.module.scss";
import classNames from "classnames";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "@src/store/store";
import {
  decrementPartCount,
  inсrementPartCount,
} from "@src/store/slices/requiredParts.slice";

type Props = {
  withControls?: boolean;
  name: string;
  eng_name: string;
  id: string;
  count?: number;
  onClickAdd?: () => void;
  max?: number;
};

const SearchedDetail: FC<Props> = ({
  withControls = true,
  name,
  eng_name,
  id,
  count,
  max,
  onClickAdd,
}) => {
  const { i18n } = useTranslation("mainPage", { keyPrefix: "inputs" });
  const dispathch = useAppDispatch();

  const handleIncrement = () => dispathch(inсrementPartCount(id));

  const handleDecrement = () => dispathch(decrementPartCount(id));

  const partName = i18n.language === "ru" ? name : eng_name;

  return (
    <div
      className={classNames(styles.wrapper, {
        [styles.withoutControls]: !withControls,
      })}
      onClick={!withControls && onClickAdd ? onClickAdd : undefined}
    >
      <div className={styles.info}>
        <DetailSearchPicture src={`parts/${id}.png`} alt={partName} />
        <p>{partName}</p>
      </div>

      {withControls && (
        <div className={styles.controls}>
          <SquareSmallButton variant="white" onClick={handleDecrement}>
            -
          </SquareSmallButton>

          <span>{count}</span>

          <SquareSmallButton
            variant="primary"
            onClick={handleIncrement}
            disabled={count !== undefined && max !== undefined && count >= max}
          >
            +
          </SquareSmallButton>
        </div>
      )}
    </div>
  );
};

export default SearchedDetail;
