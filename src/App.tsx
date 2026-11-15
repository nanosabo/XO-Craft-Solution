import Router from "@src/Router";
import ConfirmDialogHost from "@src/ui/ConfirmDialog";
import "@styles/global.scss";
import RootLayout from "./layouts/RootLayout";

function App() {
  return (
    <RootLayout>
      <Router />
      <ConfirmDialogHost />
    </RootLayout>
  );
}

export default App;
