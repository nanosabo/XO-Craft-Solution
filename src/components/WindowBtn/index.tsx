import React, { FC } from "react";
import { CloseIcon, HideIcon } from "@src/ui/icons";
import styles from "./styles/WindowBtn.module.scss";
import classNames from "classnames";

type Props = {
  type: "close" | "hide";
};

const icon = {
  close: <CloseIcon />,
  hide: <HideIcon />,
};

const handleClick = {
  close() {
    window.ipcRenderer.send("minimize");
  },
  hide() {
    window.ipcRenderer.send("close");
  },
};

const WindowBtn: FC<Props> = ({ type }) => {
  const className = classNames(styles.window_button, {
    [styles.hide]: type === "hide",
  });

  return (
    <button className={className} onClick={handleClick[type]}>
      {icon[type]}
    </button>
  );
};

export default WindowBtn;
