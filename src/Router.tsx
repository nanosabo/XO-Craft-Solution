import { createHashRouter, RouterProvider } from "react-router-dom";
import MainPage from "./pages/MainPage";
import LoadingPage from "./pages/LoadingPage";

const router = createHashRouter([
  {
    path: "/",
    element: <MainPage />,
  },
  {
    path: "/loading",
    element: <LoadingPage />,
  },
]);

const Router = () => {
  return <RouterProvider router={router} />;
};

export default Router;
