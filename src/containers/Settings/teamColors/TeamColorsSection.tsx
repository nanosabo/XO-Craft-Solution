import { useTranslation } from "react-i18next";
import {
  DEFAULT_TEAM_COLORS,
  teamColorVars,
  type Team,
  type TeamColors,
} from "@src/helpers/teamColors";
import {
  resetTeamColors,
  setTeamColor,
} from "@src/store/slices/settings.slice";
import { useAppDispatch } from "@src/store/store";
import SettingRow from "../components/SettingRow";
import SettingsSection from "../components/SettingsSection";
import styles from "../styles/Settings.module.scss";

const TEAMS: Team[] = ["ally", "enemy"];

interface Props {
  teamColors: TeamColors;
}

const TeamColorsSection = ({ teamColors }: Props) => {
  const { t } = useTranslation("settingsPage");
  const dispatch = useAppDispatch();
  const isDefault = TEAMS.every(
    (team) => teamColors[team] === DEFAULT_TEAM_COLORS[team],
  );

  return (
    <SettingsSection
      title={t("logs.colors.title")}
      subtitle={t("logs.colors.subtitle")}
      action={
        <button
          type="button"
          className={styles.button}
          disabled={isDefault}
          onClick={() => dispatch(resetTeamColors())}
        >
          {t("logs.colors.reset")}
        </button>
      }
    >
      {TEAMS.map((team) => (
        <SettingRow
          key={team}
          title={t(`logs.colors.${team}`)}
          description={t(`logs.colors.${team}Hint`)}
        >
          <div className={styles.teamColor} style={teamColorVars(teamColors)}>
            <div
              className={styles.teamPreview}
              data-team={team}
              aria-hidden="true"
            >
              <span>{t("logs.colors.previewPlayer")}</span>
              <span>{t("logs.colors.previewWeapon")}</span>
            </div>
            <label className={styles.colorPicker}>
              <input
                type="color"
                value={teamColors[team]}
                aria-label={t(`logs.colors.${team}`)}
                onChange={(event) =>
                  dispatch(setTeamColor({ team, color: event.target.value }))
                }
              />
              <span>{teamColors[team]}</span>
            </label>
          </div>
        </SettingRow>
      ))}
    </SettingsSection>
  );
};

export default TeamColorsSection;
