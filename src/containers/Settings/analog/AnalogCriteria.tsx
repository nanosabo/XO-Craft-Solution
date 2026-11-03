import { FC } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "@src/store/store";
import {
  AnalogTolerances,
  resetAnalogTolerances,
  setAnalogTolerance,
} from "@src/store/slices/settings.slice";
import NumberField from "../components/NumberField";
import SettingsSection from "../components/SettingsSection";
import styles from "../styles/Settings.module.scss";

interface Props {
  analog: AnalogTolerances;
}

const AnalogCriteria: FC<Props> = ({ analog }) => {
  const { t } = useTranslation("settingsPage");
  const dispatch = useAppDispatch();

  return (
    <SettingsSection
      title={t("analog.title")}
      action={
        <button
          type="button"
          className={styles.button}
          onClick={() => dispatch(resetAnalogTolerances())}
        >
          {t("analog.reset")}
        </button>
      }
    >
      <div className={styles.criteriaGrid}>
        <NumberField
          label={t("analog.power")}
          hint={t("analog.powerHint")}
          value={analog.power}
          suffix={t("analog.unitPower")}
          onChange={(value) =>
            dispatch(setAnalogTolerance({ key: "power", value }))
          }
        />
        <NumberField
          label={t("analog.weight")}
          hint={t("analog.weightHint")}
          value={analog.weight}
          suffix={t("analog.unitWeight")}
          onChange={(value) =>
            dispatch(setAnalogTolerance({ key: "weight", value }))
          }
        />
        <NumberField
          label={t("analog.durability")}
          hint={t("analog.durabilityHint")}
          value={analog.durability}
          suffix={t("analog.unitDurability")}
          onChange={(value) =>
            dispatch(setAnalogTolerance({ key: "durability", value }))
          }
        />
      </div>
    </SettingsSection>
  );
};

export default AnalogCriteria;
