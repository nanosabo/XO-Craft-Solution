import React, { FC, memo, useState } from "react";
import styles from "./styles/PartItem.module.scss";
import classNames from "classnames";
import { useTranslation } from "react-i18next";
import { contentLanguage } from "@src/helpers/contentLanguage";
import { BackArrowIcon, MinusIcon, RefreshIcon, TrashIcon } from "@src/ui/icons";
import { useAppDispatch } from "@src/store/store";
import { scheduleSolutionRefresh } from "@src/helpers/scheduleSolutionRefresh";
import {
  excludePart,
  removeRequiredPart,
  returnPart,
} from "@src/store/slices/requiredParts.slice";

type Props = {
  id: string;
  name: string;
  eng_name: string;
  count: number;
  isForbidden?: boolean;
  isRequired?: boolean;
  onShowAnalogs?: () => void;
  onRestoreOriginal?: () => void;
  onExcluded?: () => void;
};

const PartItem: FC<Props> = memo(
  ({
    id,
    name,
    eng_name,
    count,
    isForbidden,
    isRequired,
    onShowAnalogs,
    onRestoreOriginal,
    onExcluded,
  }) => {
    const [isActive, setIsActive] = useState(false);

    const { t, i18n } = useTranslation("solvePage");
    const dispatch = useAppDispatch();

    const onClick = () => {
      if (isForbidden) return;
      setIsActive((prev) => !prev);
    };

    const onClickRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (isForbidden) {
        dispatch(returnPart(id));
      } else {
        setIsActive(false);
        dispatch(excludePart({ id, name, eng_name, maxCount: 0 }));
        onExcluded?.();
      }

      scheduleSolutionRefresh(dispatch);
    };

    const onUnpin = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      dispatch(removeRequiredPart(id));
      scheduleSolutionRefresh(dispatch);
    };

    const onClickAnalogs = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onShowAnalogs?.();
    };

    const onClickRestoreOriginal = (
      e: React.MouseEvent<HTMLButtonElement>,
    ) => {
      e.stopPropagation();
      onRestoreOriginal?.();
    };

    const partName =
      contentLanguage(i18n.language) === "ru" ? name : eng_name;
    const btnTitle = isForbidden ? "return" : "exclude";

    return (
      <div
        className={classNames(styles.root, {
          [styles.active]: isActive,
          [styles.forbidden]: isForbidden,
          [styles.required]: isRequired && !isForbidden,
        })}
        onClick={onClick}
      >
        <p title={partName}>{partName}</p>
        <img
          src={`https://nanosabo.github.io/xocs-imgs/images/parts/${id}.png`}
          alt={partName}
          draggable={false}
        />
        <span
          className={styles.count}
          title={`${count} ${t("totals.partsUsed.prefix")}`}
        >
          {count}×
        </span>

        {isRequired && !isForbidden && (
          <button
            type="button"
            className={classNames(styles.action, styles.unpin)}
            title={t("filter.unpin")}
            onClick={onUnpin}
          >
            <MinusIcon />
          </button>
        )}

        <div className={styles.actions}>
          {onShowAnalogs && (
            <button
              className={classNames(styles.action, styles.similar)}
              title={t("similar.action")}
              onClick={onClickAnalogs}
            >
              <RefreshIcon />
            </button>
          )}

          {onRestoreOriginal && (
            <button
              className={classNames(styles.action, styles.restore)}
              title={t("restore.title")}
              onClick={onClickRestoreOriginal}
            >
              <BackArrowIcon />
            </button>
          )}

          <button
            className={classNames(styles.action, styles.exclude, {
              [styles.return]: isForbidden,
            })}
            title={t(`${btnTitle}.title`)}
            onClick={onClickRemove}
          >
            {isForbidden ? <BackArrowIcon /> : <TrashIcon />}
          </button>
        </div>
      </div>
    );
  },
);

export default PartItem;
