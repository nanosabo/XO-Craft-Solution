import AppOpenLog from "@src/components/AppOpenLog";
import NotificationModeSync from "@src/components/NotificationModeSync";
import ErrorBoundary from "@src/components/ErrorBoundary";
import GlobalErrorHandler from "@src/components/GlobalErrorHandler";
import UpdaterBridge from "@src/components/UpdaterBridge";
import Header from "@src/containers/Header";
import UpdateToast from "@src/containers/UpdateToast";
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
        <AppOpenLog />
        {/* Keep the window controls available even when a render error is shown. */}
        <WindowActions />
        <ErrorBoundary>
          <Header />
          <main>{children}</main>
        </ErrorBoundary>
        <NotificationModeSync />
        <UpdaterBridge />
        <UpdateToast />
      </HashRouter>
    </Provider>
  );
};

export default RootLayout;
