import { useAppDispatch, useAppSelector } from "@src/store/store";
import {
  selectSettingsState,
  setKeepInstalledParts,
} from "@src/store/slices/settings.slice";
import InstalledPartsSection from "./general/InstalledPartsSection";
import styles from "./styles/Settings.module.scss";

const SelectionSettings = () => {
  const dispatch = useAppDispatch();
  const { keepInstalledParts } = useAppSelector(selectSettingsState);

  return (
    <div className={styles.panel}>
      <InstalledPartsSection
        enabled={keepInstalledParts}
        onChange={(enabled) => dispatch(setKeepInstalledParts(enabled))}
      />
    </div>
  );
};

export default SelectionSettings;
