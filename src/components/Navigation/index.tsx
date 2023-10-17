import NavLink from "@src/ui/NavLink";
import { HomeIcon, InfoIcon, SettingsIcon } from "@src/ui/icons";
import styles from "./styles/Navigation.module.scss";
import { useTranslation } from "react-i18next";

const links = [
  {
    href: "/",
    icon: <HomeIcon />,
    key: "main",
  },
  {
    href: "/settings",
    icon: <SettingsIcon />,
    key: "settings",
  },
  {
    href: "/about",
    icon: <InfoIcon />,
    key: "about",
  },
];

const Navigation = () => {
  const { t } = useTranslation("navigation");

  return (
    <nav className={styles.nav}>
      {links.map(({ href, icon, key }) => (
        <NavLink key={key} icon={icon} href={href} title={t(key)} />
      ))}
    </nav>
  );
};

export default Navigation;
