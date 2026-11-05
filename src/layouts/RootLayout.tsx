import ErrorBoundary from "@src/components/ErrorBoundary";
import GlobalErrorHandler from "@src/components/GlobalErrorHandler";
import Header from "@src/containers/Header";
import WindowActions from "@src/containers/WindowActions";
import { store } from "@src/store/store";
import { FC, PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { HashRouter } from "react-router-dom";

const RootLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <Provider store={store}>
      <HashRouter>
        <GlobalErrorHandler />
        {/* Keep the window controls available even when a render error is shown. */}
        <WindowActions />
        <ErrorBoundary>
          <Header />
          <main>{children}</main>
        </ErrorBoundary>
      </HashRouter>
    </Provider>
  );
};

export default RootLayout;
