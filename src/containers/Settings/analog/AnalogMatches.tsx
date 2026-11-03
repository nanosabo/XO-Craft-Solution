import classNames from "classnames";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import PartImage from "../components/PartImage";
import PartSummary from "../components/PartSummary";
import { getPartName } from "../types";
import { AnalogMatch, formatDelta } from "./helpers";
import styles from "../styles/Settings.module.scss";

interface Props {
  matches: AnalogMatch[];
}

const AnalogMatches: FC<Props> = ({ matches }) => {
  const { t, i18n } = useTranslation("settingsPage");

  return (
    <>
      <div className={styles.matchesHeader}>
        <p>{t("analog.matches", { count: matches.length })}</p>
        <span>{t("analog.sameCategory")}</span>
      </div>

      {matches.length === 0 ? (
        <p className={styles.muted}>{t("analog.noMatches")}</p>
      ) : (
        <div className={styles.analogList}>
          {matches.map(
            ({ part, powerDelta, weightDelta, durabilityDelta }) => (
              <div key={part.id} className={styles.analogRow}>
                <PartImage id={part.id} />
                <PartSummary
                  part={part}
                  name={getPartName(part, i18n.language)}
                />

                <div className={styles.deltas}>
                  <span
                    className={classNames(styles.delta, {
                      [styles.deltaGood]: powerDelta >= 0,
                      [styles.deltaBad]: powerDelta < 0,
                    })}
                  >
                    {formatDelta(powerDelta, t("analog.powerDelta"))}
                  </span>
                  <span
                    className={classNames(styles.delta, {
                      [styles.deltaGood]: weightDelta <= 0,
                      [styles.deltaBad]: weightDelta > 0,
                    })}
                  >
                    {formatDelta(weightDelta, t("analog.weightDelta"))}
                  </span>
                  <span
                    className={classNames(styles.delta, {
                      [styles.deltaGood]: durabilityDelta >= 0,
                      [styles.deltaBad]: durabilityDelta < 0,
                    })}
                  >
                    {formatDelta(
                      durabilityDelta,
                      t("analog.durabilityDelta"),
                    )}
                  </span>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </>
  );
};

export default AnalogMatches;
