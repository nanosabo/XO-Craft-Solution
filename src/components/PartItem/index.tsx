import React, { FC, memo, useState } from "react";
import styles from "./styles/PartItem.module.scss";
import classNames from "classnames";
import { useTranslation } from "react-i18next";
import { BackArrowIcon, TrashIcon } from "@src/ui/icons";
import { useAppDispatch } from "@src/store/store";
import { excludePart, returnPart } from "@src/store/slices/requiredParts.slice";

type Props = {
  id: string;
  name: string;
  eng_name: string;
  count: number;
  isForbidden?: boolean;
};

const PartItem: FC<Props> = memo(
  ({ id, name, eng_name, count, isForbidden }) => {
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
      }
    };

    const partName = i18n.language === "ru" ? name : eng_name;
    const btnTitle = isForbidden ? "return" : "exclude";

    return (
      <div
        className={classNames(styles.root, {
          [styles.active]: isActive,
          [styles.forbidden]: isForbidden,
        })}
        onClick={onClick}
      >
        <p>{partName}</p>
        <img src={`parts/${id}.png`} alt={partName} draggable={false} />
        <span>
          {count} {t("totals.partsUsed.prefix")}
        </span>

        <button
          className={classNames(styles.exclude, {
            [styles.return]: isForbidden,
          })}
          title={t(`${btnTitle}.title`)}
          onClick={onClickRemove}
        >
          {isForbidden ? <BackArrowIcon /> : <TrashIcon />}
        </button>
      </div>
    );
  }
);

export default PartItem;
