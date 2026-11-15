import { FC, useEffect, useState } from "react";
import {
  CloseIcon,
  HideIcon,
  MaximizeIcon,
  RestoreIcon,
} from "@src/ui/icons";
import styles from "./styles/WindowButton.module.scss";
import classNames from "classnames";

type Props = {
  type: "close" | "hide" | "maximize";
};

const handleClick = {
  hide() {
    window.ipcRenderer.send("minimize");
  },
  maximize() {
    window.electronAPI.toggleMaximize();
  },
  close() {
    window.ipcRenderer.send("close");
  },
};

const useWindowMaximized = (enabled: boolean) => {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let alive = true;

    window.electronAPI
      .getWindowMaximized()
      .then((value) => {
        if (alive) setMaximized(value);
      })
      .catch(() => undefined);

    const unsubscribe = window.electronAPI.onWindowMaximized(setMaximized);

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [enabled]);

  return maximized;
};

const WindowButton: FC<Props> = ({ type }) => {
  const maximized = useWindowMaximized(type === "maximize");
  const className = classNames(styles.window_button, {
    [styles.close]: type === "close",
  });

  const icon = {
    close: <CloseIcon />,
    hide: <HideIcon />,
    maximize: maximized ? <RestoreIcon /> : <MaximizeIcon />,
  }[type];

  return (
    <button className={className} onClick={handleClick[type]}>
      {icon}
    </button>
  );
};

export default WindowButton;
