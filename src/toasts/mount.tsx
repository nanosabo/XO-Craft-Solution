import ReactDOM from "react-dom/client";
import ToastHost from "./ToastHost";
import "./toast.scss";

ReactDOM.createRoot(document.getElementById("root")!).render(<ToastHost />);

postMessage({ payload: "removeLoading" }, "*");
