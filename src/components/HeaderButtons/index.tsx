import SquareButton from "@src/ui/SquareButton";
import { DiscordIcon } from "@src/ui/icons";
import styles from "./styles/HeaderButtons.module.scss";
import SwitchLanguageButton from "../SwitchLanguageButton";

const HeaderButtons = () => {
  const handleOpenDiscordExternal = () => {
    window.ipcRenderer.send("openDiscordExternal");
  };

  return (
    <div className={styles.buttons}>
      <SwitchLanguageButton />

      <SquareButton onClick={handleOpenDiscordExternal}>
        <DiscordIcon />
      </SquareButton>
    </div>
  );
};

export default HeaderButtons;
