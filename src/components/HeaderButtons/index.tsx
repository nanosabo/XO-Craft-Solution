import SquareButton from "@src/ui/SquareButton";
import WindowButton from "@src/ui/WindowButton";
import { HeaderDiscordIcon, SettingsIcon } from "@src/ui/icons";
import styles from "./styles/HeaderButtons.module.scss";
import SwitchLanguageButton from "../SwitchLanguageButton";
import PrevSolutionButton from "../PrevSolutionButton";
import classNames from "classnames";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";

const HeaderButtons = () => {
  const { t } = useTranslation("navigation");
  const { pathname } = useLocation();
  const settingsActive =
    pathname === "/settings" || pathname.startsWith("/settings/");

  const handleOpenDiscordExternal = () => {
    window.ipcRenderer.send("openDiscordExternal");
  };

  return (
    <div className={styles.buttons} data-header-controls>
      <div className={styles.tools}>
        <NavLink
          to="/settings"
          title={t("settings")}
          className={classNames(styles.settings, {
            [styles.active]: settingsActive,
          })}
          onClick={(event) => {
            if (pathname === "/settings") event.preventDefault();
          }}
        >
          <SettingsIcon />
        </NavLink>

        <SwitchLanguageButton />

        <SquareButton
          className={styles.discord}
          onClick={handleOpenDiscordExternal}
          title="Discord"
        >
          <HeaderDiscordIcon />
        </SquareButton>

        <PrevSolutionButton />
      </div>

      <span className={styles.divider} aria-hidden="true" />

      <WindowButton type="hide" />
      <WindowButton type="close" />
    </div>
  );
};

export default HeaderButtons;
