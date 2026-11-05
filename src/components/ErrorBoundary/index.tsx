import { Component, ErrorInfo, ReactNode } from "react";
import LoadingErrorScreen from "@src/containers/LoadingErrorScreen";
import { AppError, logError, toAppError } from "@src/helpers/errorLog";
import { getLastAppRoute } from "@src/helpers/lastRoute";
import { clearLoaderError } from "@src/store/slices/loader.slice";
import { store } from "@src/store/store";

interface Props {
  children: ReactNode;
}

interface State {
  error: AppError | null;
}

/**
 * Keeps a render failure from producing a blank window. The error is logged and
 * shown on the same screen that is used for loading/solve failures.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: toAppError("render", error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // Render failures are handled locally so the user stays on the current
    // route; the global handler is reserved for async and main-process errors.
    logError("render", error, {
      componentStack: info.componentStack ?? undefined,
    });
  }

  handleBack = () => {
    store.dispatch(clearLoaderError());
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <LoadingErrorScreen
          error={this.state.error}
          returnTo={getLastAppRoute()}
          onBack={this.handleBack}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
