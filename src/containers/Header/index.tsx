import AppLogo from "@src/components/AppLogo";
import Navigation from "@src/components/Navigation";
import WindowActions from "../WindowActions";
import { useLocation } from "react-router-dom";
import styles from "./styles/Header.module.scss";
import HeaderButtons from "@src/components/HeaderButtons";

const Header = () => {
  const location = useLocation();
  const isLoadingPage = location.pathname === "/loading";

  return (
    <header className={styles.header}>
      {!isLoadingPage && <AppLogo />}
      {!isLoadingPage && <Navigation />}
      {!isLoadingPage && <HeaderButtons />}

      <WindowActions />
    </header>
  );
};

export default Header;
