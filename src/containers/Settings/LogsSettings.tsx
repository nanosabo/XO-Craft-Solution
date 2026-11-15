import { selectSettingsState } from "@src/store/slices/settings.slice";
import { useAppSelector } from "@src/store/store";
import LogsPathSection from "./general/LogsPathSection";
import TeamColorsSection from "./logs/TeamColorsSection";
import styles from "./styles/Settings.module.scss";

const LogsSettings = () => {
  const { crossoutLogsPath, teamColors } = useAppSelector(selectSettingsState);

  return (
    <div className={styles.panel}>
      <LogsPathSection logsPath={crossoutLogsPath} />
      <TeamColorsSection teamColors={teamColors} />
    </div>
  );
};

export default LogsSettings;
