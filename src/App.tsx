import Router from "@src/Router";
import RootLayout from "./layouts/RootLayout";
import "@styles/global.scss";

function App() {
  return (
    <RootLayout>
      <Router />
    </RootLayout>
  );
}

export default App;
