import { useAppDispatch, useAppSelector } from "@src/store/store";
import PartsFilterButton from "./PartsFilterButton";
import styles from "./styles/PartsFilter.module.scss";
import { selectLoaderState, clearInstalledParts } from "@src/store/slices/loader.slice";
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
  const installedCount = useAppSelector(
    (state) => selectLoaderState(state).installedParts.length,
  );
  const dispatch = useAppDispatch();

  const { t } = useTranslation("mainPage");

  const isParts = switched === "parts";
  const isForbidden = switched === "forbidden";
  const isInstalled = switched === "installed";
  const partsCount = parts.length;
  const forbiddenCount = forbidden.length;

  const onClick = (payload: requiredPartsState["switched"]) => {
    dispatch(setSwitched(payload));
  };

  const currentCount = isInstalled
    ? installedCount
    : isForbidden
      ? forbiddenCount
      : partsCount;

  const onClear = () => {
    if (isInstalled) {
      dispatch(clearInstalledParts());
      return;
    }

    dispatch(clearRequiredParts(isForbidden ? "forbidden" : "parts"));
  };

  return (
    <div className={styles.root}>
      <div className={styles.parts}>
        <PartsFilterButton
          onClick={onClick.bind(this, "parts")}
          disabled={isParts}
        >
          {t("required.tab")}
          <span className={styles.count}>{partsCount}</span>
        </PartsFilterButton>
        <PartsFilterButton
          className={styles.installedTab}
          onClick={onClick.bind(this, "installed")}
          disabled={isInstalled}
        >
          {t("mounted.tab")}
          <span className={styles.count}>{installedCount}</span>
        </PartsFilterButton>
        <PartsFilterButton
          className={styles.forbiddenTab}
          onClick={onClick.bind(this, "forbidden")}
          disabled={isForbidden}
        >
          {t("forbidden.tab")}
          <span className={styles.count}>{forbiddenCount}</span>
        </PartsFilterButton>
      </div>

      <button
        type="button"
        className={styles.clear_button}
        onClick={onClear}
        title={t(
          isInstalled
            ? "mounted.clear"
            : isForbidden
              ? "forbidden.clear"
              : "required.clear",
        )}
        disabled={currentCount === 0}
      >
        <TrashIcon />
      </button>
    </div>
  );
};

export default PartsFilterButtons;
