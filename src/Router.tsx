import { createHashRouter, RouterProvider } from "react-router-dom";
import MainPage from "./pages/MainPage";

const router = createHashRouter([
  {
    path: "/",
    element: <MainPage />,
  },
]);

const Router = () => {
  return <RouterProvider router={router} />;
};

export default Router;
