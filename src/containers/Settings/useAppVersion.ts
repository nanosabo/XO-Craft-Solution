import { useEffect, useState } from "react";

const useAppVersion = (fallback = "2.0") => {
  const [version, setVersion] = useState(fallback);

  useEffect(() => {
    window.electronAPI.getVersion().then(setVersion);
  }, []);

  return version;
};

export default useAppVersion;
