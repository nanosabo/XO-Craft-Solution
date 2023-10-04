import WindowBtn from "@src/components/WindowBtn";
import styles from "./styles/WindowActions.module.scss";

const WindowActions = () => {
  return (
    <div className={styles.window_actions}>
      <WindowBtn type="hide" />
      <WindowBtn type="close" />
    </div>
  );
};

export default WindowActions;
