import InputSection from "@src/components/InputSection";
import { useTranslation } from "react-i18next";
import styles from "./styles/ColumtInputs.module.scss";
import { allColumns } from "./inputsTypes";
import RequiredDetails from "../RequiredDetails";

const ColumnInputs = () => {
  const { t, i18n } = useTranslation("mainPage", { keyPrefix: "inputs" });

  return (
    <div className={styles.wrapper}>
      {allColumns.map((inputs, key) => (
        <div key={key} className={styles.block}>
          {Object.entries(inputs).map(([name, { icon, type }]) => (
            <InputSection
              key={name}
              icon={icon}
              type={type}
              title={t(`${name}.title`)}
              placeholder={t("placeholder")}
              tooltipTitle={t(`${name}.tooltip.title`)}
              toolTipSubtitle={t(`${name}.tooltip.subtitle`)}
              tooltipImage={
                inputs[name].image
                  ? `tooltips/${i18n.language}/${name}.png`
                  : undefined
              }
            />
          ))}
        </div>
      ))}

      <div className={styles.block}>
        <InputSection
          icon="PuzzleIcon"
          type="search"
          title={t("requriedParts.title")}
          placeholder={t("searchPlaceholder")}
          tooltipTitle={t(`requriedDetails.tooltip.title`)}
          toolTipSubtitle={t(`requriedDetails.tooltip.subtitle`)}
        />

        <RequiredDetails />
      </div>
    </div>
  );
};

export default ColumnInputs;
