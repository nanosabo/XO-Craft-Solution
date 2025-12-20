import { Route, Routes, useLocation } from "react-router-dom";
import MainPage from "./pages/MainPage";
import LoadingPage from "./pages/LoadingPage";
import { AnimatePresence } from "framer-motion";
import SettingsPage from "./pages/SettingsPage";
import SolvedPage from "./pages/SolvedPage";

const Router = () => {
  const location = useLocation();

  return (
    <AnimatePresence>
      <Routes location={location} key={location.key}>
        <Route path="/" element={<MainPage />} />
        <Route path="/loading" element={<LoadingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/solved" element={<SolvedPage />} />
      </Routes>
    </AnimatePresence>
  );
};

export default Router;
