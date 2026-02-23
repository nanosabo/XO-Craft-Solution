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
  const { switched } = useAppSelector(selectRequiredPartsState);
  const dispatch = useAppDispatch();

  const { t } = useTranslation("mainPage");

  const isParts = switched === "parts";
  const isForbidden = switched === "forbidden";

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
        </PartsFilterButton>
        <PartsFilterButton
          onClick={onClick.bind(this, "forbidden")}
          disabled={isForbidden}
        >
          {t("forbidden.title")}
        </PartsFilterButton>
      </div>

      <button
        className={styles.clear_button}
        onClick={onClear}
        title={t("clear")}
      >
        <TrashIcon />
      </button>
    </div>
  );
};

export default PartsFilterButtons;
