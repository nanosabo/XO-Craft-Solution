import { useEffect, useState } from "react";
import { logWarning } from "@src/helpers/errorLog";

const useAppVersion = (fallback = "2.0") => {
  const [version, setVersion] = useState(fallback);

  useEffect(() => {
    window.electronAPI
      .getVersion()
      .then(setVersion)
      .catch((error) => logWarning("version", error));
  }, []);

  return version;
};

export default useAppVersion;
