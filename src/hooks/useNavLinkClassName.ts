import styles from "@src/ui/NavigationLink/styles/NavigationLink.module.scss";
import classNames from "classnames";

const useNavLinkClassName = (href: string) => {
  const path = window.location.pathname;

  const className = classNames(styles.navlink, {
    [styles.active]: path === href,
  });

  return className;
};

export default useNavLinkClassName;
