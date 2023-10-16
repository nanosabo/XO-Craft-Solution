import WindowButton from "@src/ui/WindowButton";
import styles from "./styles/WindowActions.module.scss";

const WindowActions = () => {
  return (
    <div className={styles.window_actions}>
      <WindowButton type="hide" />
      <WindowButton type="close" />
    </div>
  );
};

export default WindowActions;
