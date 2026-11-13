import DetailSearchPicture from "@src/components/DetailSearchPicture";
import SquareSmallButton from "@src/ui/SquareSmallButton";
import { TrashIcon } from "@src/ui/icons";
import { FC } from "react";
import styles from "./styles/SearchedDetail.module.scss";
import classNames from "classnames";
import { useTranslation } from "react-i18next";
import { contentLanguage } from "@src/helpers/contentLanguage";
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
  size?: string;
  onClickAdd?: () => void;
  max?: number;
  onlyDelete?: boolean;
};

const SearchedDetail: FC<Props> = ({
  withControls = true,
  onlyDelete,
  name,
  eng_name,
  id,
  count,
  size,
  max,
  onClickAdd,
}) => {
  const { t, i18n } = useTranslation("mainPage");
  const dispathch = useAppDispatch();

  const handleIncrement = () => dispathch(inсrementPartCount(id));

  const handleDecrement = () => dispathch(decrementPartCount(id));

  const partName = contentLanguage(i18n.language) === "ru" ? name : eng_name;

  return (
    <div
      className={classNames(styles.wrapper, {
        [styles.withoutControls]: !withControls,
        [styles.forbidden]: onlyDelete,
      })}
      onClick={!withControls && onClickAdd ? onClickAdd : undefined}
    >
      <div className={styles.info}>
        <DetailSearchPicture
          src={`https://nanosabo.github.io/xocs-imgs/images/parts/${id}.png`}
          alt={partName}
        />
        <p>{partName}</p>
        {size && <span className={styles.size}>{size}</span>}
      </div>

      {withControls && (
        <div className={styles.controls}>
          {onlyDelete ? (
            <button
              type="button"
              className={styles.remove}
              title={t("filterSearch.remove")}
              onClick={handleDecrement}
            >
              <TrashIcon />
            </button>
          ) : (
            <>
              <SquareSmallButton variant="white" onClick={handleDecrement}>
                -
              </SquareSmallButton>
              <span>{count}</span>
              <SquareSmallButton
                variant="primary"
                onClick={handleIncrement}
                disabled={
                  count !== undefined && max !== undefined && count >= max
                }
              >
                +
              </SquareSmallButton>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchedDetail;
