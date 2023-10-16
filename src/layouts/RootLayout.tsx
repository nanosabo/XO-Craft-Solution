import Header from "@src/containers/Header";
import { store } from "@src/store/store";
import { Provider } from "react-redux";
import { Outlet } from "react-router-dom";

const RootLayout = () => {
  return (
    <Provider store={store}>
      <Header />
      <main>
        <Outlet />
      </main>
    </Provider>
  );
};

export default RootLayout;
