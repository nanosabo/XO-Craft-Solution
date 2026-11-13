import { useAppDispatch, useAppSelector } from "@src/store/store";
import PartsFilterButton from "./PartsFilterButton";
import styles from "./styles/PartsFilter.module.scss";
import {
  clearRequiredParts,
  requiredPartsState,
  selectRequiredPartsState,
  setSwitched,
} from "@src/store/slices/requiredParts.slice";
import { useTranslation } from "react-i18next";
import { TrashIcon } from "@src/ui/icons";

const PartsFilterButtons = () => {
  const { switched, parts, forbidden } = useAppSelector(selectRequiredPartsState);
  const dispatch = useAppDispatch();

  const { t } = useTranslation("mainPage");

  const isParts = switched === "parts";
  const isForbidden = switched === "forbidden";
  const partsCount = parts.length;
  const forbiddenCount = forbidden.length;

  const onClick = (payload: requiredPartsState["switched"]) => {
    dispatch(setSwitched(payload));
  };

  const onClear = () => {
    dispatch(clearRequiredParts());
  };

  return (
    <div className={styles.root}>
      <div className={styles.parts}>
        <PartsFilterButton
          onClick={onClick.bind(this, "parts")}
          disabled={isParts}
        >
          {t("required.title")}
          <span className={styles.count}>{partsCount}</span>
        </PartsFilterButton>
        <PartsFilterButton
          className={styles.forbiddenTab}
          onClick={onClick.bind(this, "forbidden")}
          disabled={isForbidden}
        >
          {t("forbidden.title")}
          <span className={styles.count}>{forbiddenCount}</span>
        </PartsFilterButton>
      </div>

      <button
        type="button"
        className={styles.clear_button}
        onClick={onClear}
        title={t("clear")}
        disabled={partsCount + forbiddenCount === 0}
      >
        <TrashIcon />
      </button>
    </div>
  );
};

export default PartsFilterButtons;
