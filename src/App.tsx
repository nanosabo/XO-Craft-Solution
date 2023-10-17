import Router from "@src/Router";
import "@styles/global.scss";
import RootLayout from "./layouts/RootLayout";

function App() {
  return (
    <RootLayout>
      <Router />
    </RootLayout>
  );
}

export default App;
