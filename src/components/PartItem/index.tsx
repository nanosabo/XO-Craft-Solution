import React, { FC, memo } from "react";
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
import { removeInstalledPart } from "@src/store/slices/loader.slice";

type Props = {
  id: string;
  name: string;
  eng_name: string;
  count: number;
  isForbidden?: boolean;
  isRequired?: boolean;
  isInstalled?: boolean;
  installedCount?: number;
  isReplaced?: boolean;
  replacedTitle?: string;
  onToggleInstalled?: () => void;
  onInstalledCount?: (count: number) => void;
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
    isInstalled,
    installedCount,
    isReplaced,
    replacedTitle,
    onToggleInstalled,
    onInstalledCount,
    onShowAnalogs,
    onRestoreOriginal,
    onExcluded,
  }) => {
    const { t, i18n } = useTranslation("solvePage");
    const dispatch = useAppDispatch();

    const onClick = () => {
      if (isForbidden) return;
      onToggleInstalled?.();
    };

    const onClickRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (isForbidden) {
        dispatch(returnPart(id));
      } else {
        dispatch(excludePart({ id, name, eng_name, maxCount: 0 }));
        dispatch(removeInstalledPart(id));
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
    const mounted = Math.min(count, Math.max(1, installedCount ?? count));
    const canSplit = Boolean(isInstalled && count > 1);

    return (
      <div
        className={classNames(styles.root, {
          [styles.active]: isInstalled,
          [styles.forbidden]: isForbidden,
          [styles.required]: isRequired && !isForbidden,
          [styles.replaced]: isReplaced && !isForbidden,
          [styles.split]: canSplit,
        })}
        title={isReplaced ? replacedTitle : undefined}
        style={
          isInstalled
            ? ({
                "--installed": `${(mounted / Math.max(count, 1)) * 100}%`,
              } as React.CSSProperties)
            : undefined
        }
        onClick={onClick}
      >
        <p title={partName}>{partName}</p>
        <img
          src={`https://nanosabo.github.io/xocs-imgs/images/parts/${id}.png`}
          alt={partName}
          draggable={false}
        />
        {canSplit ? (
          <span
            className={styles.installedCount}
            title={t("installed.partial", { count: mounted, total: count })}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              disabled={mounted <= 1}
              title={t("installed.less")}
              onClick={() => onInstalledCount?.(mounted - 1)}
            >
              −
            </button>
            <b>
              {mounted < count ? `${mounted}/${count}` : `${count}×`}
            </b>
            <button
              type="button"
              disabled={mounted >= count}
              title={t("installed.more")}
              onClick={() => onInstalledCount?.(mounted + 1)}
            >
              +
            </button>
          </span>
        ) : (
          <span
            className={styles.count}
            title={`${count} ${t("totals.partsUsed.prefix")}`}
          >
            {count}×
          </span>
        )}

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
