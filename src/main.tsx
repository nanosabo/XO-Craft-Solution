import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n";

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

// Remove Preload scripts loading
postMessage({ payload: "removeLoading" }, "*");
