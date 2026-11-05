import { useEffect, useState } from "react";
import { logWarning } from "@src/helpers/errorLog";
import { Part } from "./types";

let partsCache: Part[] | null = null;
let partsRequest: Promise<Part[]> | null = null;

const loadParts = () => {
  if (partsCache) return Promise.resolve(partsCache);
  if (partsRequest) return partsRequest;

  partsRequest = window.ipcRenderer
    .invoke("getParts")
    .then((parts: Part[]) => {
      partsCache = parts;
      return parts;
    })
    .finally(() => {
      partsRequest = null;
    });

  return partsRequest;
};

const useParts = () => {
  const [parts, setParts] = useState<Part[]>(partsCache ?? []);
  const [isLoading, setIsLoading] = useState(partsCache === null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    loadParts()
      .then((loadedParts) => {
        if (!isMounted) return;
        setParts(loadedParts);
        setError(false);
      })
      .catch((error) => {
        logWarning("settings-parts", error);

        if (!isMounted) return;
        setError(true);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { parts, isLoading, error };
};

export default useParts;
