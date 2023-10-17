import Header from "@src/containers/Header";
import { store } from "@src/store/store";
import { FC, PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { HashRouter } from "react-router-dom";

const RootLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <Provider store={store}>
      <HashRouter>
        <Header />
        <main>{children}</main>
      </HashRouter>
    </Provider>
  );
};

export default RootLayout;
