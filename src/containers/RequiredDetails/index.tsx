import { useAppSelector } from "@src/store/store";
import SearchedDetail from "../SearchedDetail";
import RequiredDetailsWrapper from "./RequiredDetailsWrapper";
import { selectRequiredPartsState } from "@src/store/slices/requiredParts.slice";
import { useTranslation } from "react-i18next";
import styles from "./styles/RequiredDetails.module.scss";

const RequiredDetails = () => {
  const { t } = useTranslation("mainPage");
  const parts = useAppSelector(selectRequiredPartsState);
  const list = parts[parts.switched];

  return (
    <RequiredDetailsWrapper>
      {list.length === 0 ? (
        <p className={styles.empty}>
          {t(
            parts.switched === "forbidden"
              ? "forbidden.empty"
              : "required.empty",
          )}
        </p>
      ) : (
        list.map((item) => (
          <SearchedDetail
            key={item.id}
            name={item.name}
            eng_name={item.eng_name}
            id={item.id}
            count={item.count}
            max={item.maxCount}
            onlyDelete={parts.switched === "forbidden"}
          />
        ))
      )}
    </RequiredDetailsWrapper>
  );
};

export default RequiredDetails;
