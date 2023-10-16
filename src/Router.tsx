import {
  createHashRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from "react-router-dom";
import MainPage from "./pages/MainPage";
import LoadingPage from "./pages/LoadingPage";
import RootLayout from "./layouts/RootLayout";

const router = createHashRouter(
  createRoutesFromElements(
    <Route path="/">
      <Route element={<RootLayout />}>
        <Route index element={<MainPage />} />
        <Route path="loading" element={<LoadingPage />} />
      </Route>
    </Route>
  )
);

const Router = () => {
  return <RouterProvider router={router} />;
};

export default Router;
