import Router from "@src/Router";
import PageLayout from "./layouts/PageLayout";
import "@styles/global.scss";

function App() {
  return (
    <PageLayout>
      <Router />
    </PageLayout>
  );
}

export default App;
