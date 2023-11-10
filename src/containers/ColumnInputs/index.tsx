import InputSection, { InputSectionProps } from "@src/components/InputSection";
import { useTranslation } from "react-i18next";
import styles from "./styles/ColumtInputs.module.scss";

interface Input {
  icon: InputSectionProps["icon"];
  type: InputSectionProps["type"];
}

interface InputsData {
  [key: string]: Input;
}

const firstColumnInputs: InputsData = {
  strenght: {
    icon: "ShieldIcon",
    type: "number",
  },
  weight: {
    icon: "WeightIcon",
    type: "number",
  },
  capacity: {
    icon: "LoadCapacityIcon",
    type: "number",
  },
  details: {
    icon: "PuzzleIcon",
    type: "number",
  },
  maxDetails: {
    icon: "PuzzleIcon",
    type: "number",
  },
};

const secondColumnInputs: InputsData = {
  powerpoints: {
    icon: "FlashOutlineIcon",
    type: "number",
  },
  maxPowerpoints: {
    icon: "FlashFillIcon",
    type: "number",
  },
  minDetailHp: {
    icon: "MinLoadIcon",
    type: "number",
  },
  maxDetailHp: {
    icon: "MaxLoadIcon",
    type: "number",
  },
  driver: {
    icon: "DriverIcon",
    type: "checkbox",
  },
};

const ColumnInputs = () => {
  const { t } = useTranslation("mainPage", { keyPrefix: "inputs" });

  return (
    <div className={styles.wrapper}>
      <div className={styles.block}>
        {Object.entries(firstColumnInputs).map(([name, { icon, type }]) => (
          <InputSection
            key={name}
            icon={icon}
            type={type}
            title={t(name)}
            placeholder={t("placeholder")}
          />
        ))}
      </div>

      <div className={styles.block}>
        {Object.entries(secondColumnInputs).map(([name, { icon, type }]) => (
          <InputSection
            key={name}
            icon={icon}
            type={type}
            title={t(name)}
            placeholder={t("placeholder")}
          />
        ))}
      </div>

      <div className={styles.block}>
        <InputSection
          icon="PuzzleIcon"
          type="search"
          title={t("requriedDetails")}
          placeholder={t("searchPlaceholder")}
        />
      </div>
    </div>
  );
};

export default ColumnInputs;
