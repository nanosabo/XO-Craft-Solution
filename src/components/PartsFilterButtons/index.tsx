import { useAppDispatch, useAppSelector } from "@src/store/store";
import PartsFilterButton from "./PartsFilterButton";
import styles from "./styles/PartsFilter.module.scss";
import {
  requiredPartsState,
  selectRequiredPartsState,
  setSwitched,
} from "@src/store/slices/requiredParts.slice";
import { useTranslation } from "react-i18next";

const PartsFilterButtons = () => {
  const { switched } = useAppSelector(selectRequiredPartsState);
  const dispatch = useAppDispatch();

  const { t } = useTranslation("mainPage");

  const isParts = switched === "parts";
  const isForbidden = switched === "forbidden";

  const onClick = (payload: requiredPartsState["switched"]) => {
    dispatch(setSwitched(payload));
  };

  return (
    <div className={styles.root}>
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
  );
};

export default PartsFilterButtons;
