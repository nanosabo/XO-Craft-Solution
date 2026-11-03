import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import PartImage from "../components/PartImage";
import PartSummary from "../components/PartSummary";
import { getPartName, Part } from "../types";
import styles from "../styles/Settings.module.scss";

interface Props {
  part: Part;
  onChange: () => void;
}

const AnalogBasePart = forwardRef<HTMLDivElement, Props>(
  ({ part, onChange }, ref) => {
    const { t, i18n } = useTranslation("settingsPage");
    const name = getPartName(part, i18n.language);

    return (
      <div className={styles.basePart} ref={ref}>
        <PartImage id={part.id} />
        <PartSummary
          part={part}
          name={name}
          label={<span className={styles.baseLabel}>{t("analog.base")}</span>}
        />
        <button type="button" className={styles.button} onClick={onChange}>
          {t("analog.change")}
        </button>
      </div>
    );
  },
);

AnalogBasePart.displayName = "AnalogBasePart";

export default AnalogBasePart;
