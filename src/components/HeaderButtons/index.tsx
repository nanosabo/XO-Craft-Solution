import SquareButton from "@src/ui/SquareButton";
import { DiscordIcon } from "@src/ui/icons";
import styles from "./styles/HeaderButtons.module.scss";
import SwitchLanguageButton from "../SwitchLanguageButton";
import PrevSolutionButton from "../PrevSolutionButton";

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

      <PrevSolutionButton />
    </div>
  );
};

export default HeaderButtons;
