import WindowActions from "@src/containers/WindowActions";
import { store } from "@src/store/store";
import { FC, PropsWithChildren } from "react";
import { Provider } from "react-redux";

const RootLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <Provider store={store}>
      <header>
        <WindowActions />
      </header>
      <main>{children}</main>
    </Provider>
  );
};

export default RootLayout;
