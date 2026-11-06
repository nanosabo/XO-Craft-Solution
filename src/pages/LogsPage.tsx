import { useState } from "react";
import type { BattlesViewName } from "@src/components/BattlesView";
import Clan from "@src/containers/Clan";
import Logs from "@src/containers/Logs";
import AnimatePageLayout from "@src/layouts/AnimatePageLayout";

const LogsPage = () => {
  const [view, setView] = useState<BattlesViewName>("logs");

  return (
    <AnimatePageLayout fill>
      {view === "clan" ? (
        <Clan view={view} onView={setView} />
      ) : (
        <Logs view={view} onView={setView} />
      )}
    </AnimatePageLayout>
  );
};

export default LogsPage;
