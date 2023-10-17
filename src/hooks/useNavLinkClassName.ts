import styles from "@src/ui/NavLink/styles/NavLink.module.scss";
import classNames from "classnames";
import { useLocation } from "react-router-dom";

const useNavLinkClassName = (href: string) => {
  const { pathname } = useLocation();

  const className = classNames(styles.navlink, {
    [styles.active]: pathname === href,
  });

  return className;
};

export default useNavLinkClassName;
