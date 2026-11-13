import { selectSettingsState } from "@src/store/slices/settings.slice";
import { useAppSelector } from "@src/store/store";
import LogsPathSection from "./general/LogsPathSection";
import styles from "./styles/Settings.module.scss";

const LogsSettings = () => {
  const { crossoutLogsPath } = useAppSelector(selectSettingsState);

  return (
    <div className={styles.panel}>
      <LogsPathSection logsPath={crossoutLogsPath} />
    </div>
  );
};

export default LogsSettings;
