import InputSection from "@src/components/InputSection";
import { useTranslation } from "react-i18next";
import styles from "./styles/ColumtInputs.module.scss";
import { allColumns } from "./inputsTypes";
import SearchedDetail from "../SearchedDetail";

const ColumnInputs = () => {
  const { t } = useTranslation("mainPage", { keyPrefix: "inputs" });

  return (
    <div className={styles.wrapper}>
      {allColumns.map((inputs, key) => (
        <div key={key} className={styles.block}>
          {Object.entries(inputs).map(([name, { icon, type }]) => (
            <InputSection
              key={name}
              icon={icon}
              type={type}
              title={t(name)}
              placeholder={t("placeholder")}
            />
          ))}
        </div>
      ))}

      <div className={styles.block}>
        <InputSection
          icon="PuzzleIcon"
          type="search"
          title={t("requriedDetails")}
          placeholder={t("searchPlaceholder")}
        />

        <div className={styles.required}>
          {Array(5)
            .fill(null)
            .map((_, index) => (
              <SearchedDetail key={index} />
            ))}
        </div>
      </div>
    </div>
  );
};

export default ColumnInputs;
