import { useTranslation } from "react-i18next";
import NavLink from "@src/ui/NavLink";
import { CraftIcon, GuideIcon, InfoIcon, LogsIcon, MarketIcon } from "@src/ui/icons";
import styles from "./styles/Navigation.module.scss";

const links = [
  {
    href: "/",
    icon: <CraftIcon />,
    key: "main",
  },
  {
    href: "/market",
    icon: <MarketIcon />,
    key: "market",
  },
  {
    href: "/logs",
    icon: <LogsIcon />,
    key: "logs",
  },
  {
    href: "/guides",
    icon: <GuideIcon />,
    key: "guides",
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
