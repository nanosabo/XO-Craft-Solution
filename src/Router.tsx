import { Route, Routes, useLocation } from "react-router-dom";
import MainPage from "./pages/MainPage";
import LoadingPage from "./pages/LoadingPage";
import { AnimatePresence } from "framer-motion";
import SettingsPage from "./pages/SettingsPage";
import SolvedPage from "./pages/SolvedPage";
import MarketPage from "./pages/MarketPage";
import AboutPage from "./pages/AboutPage";

const Router = () => {
  const location = useLocation();

  // The loading/error screen must not take part in route transitions. If it is
  // rendered inside AnimatePresence, the old route stays mounted while its exit
  // animation runs and can end up on top of the app after "Back to the app".
  if (location.pathname === "/loading") {
    return <LoadingPage />;
  }

  return (
    <AnimatePresence>
      <Routes location={location} key={location.key}>
        <Route path="/" element={<MainPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/solved" element={<SolvedPage />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </AnimatePresence>
  );
};

export default Router;
