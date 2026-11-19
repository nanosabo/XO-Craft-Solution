import classNames from "classnames";
import type { TFunction } from "i18next";
import styles from "../styles/Logs.module.scss";

const LogGuide = ({ t, onHelp }: { t: TFunction; onHelp: () => void }) => (
  <section className={styles.guide}>
    <h2>
      {t("upload.guideTitle")} <span>{t("upload.guideFile")}</span>
    </h2>
    <ol>
      <li>{t("upload.guideStep1")}</li>
      <li>
        {t("upload.guideStep2")}{" "}
        <span className={styles.guidePath}>{t("upload.guidePath")}</span>
      </li>
      <li>
        {t("upload.guideStep3")}{" "}
        <span className={styles.guideFileName}>combat.log</span>{" "}
        {t("upload.guideStep3b")}
      </li>
      <li>{t("upload.guideStep4")}</li>
    </ol>
    <button
      type="button"
      className={classNames(styles.secondaryButton, styles.guideHelp)}
      onClick={onHelp}
    >
      {t("upload.help.open")}
    </button>
  </section>
);

export default LogGuide;
