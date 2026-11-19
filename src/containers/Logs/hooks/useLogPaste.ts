import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { NavigateFunction } from "react-router-dom";
import { logFromClipboard, logResultsPath } from "@src/helpers/appLogLink";

export const useLogPaste = (
  navigate: NavigateFunction,
  source: "file" | "link",
  blocked: boolean,
  setLinkError: Dispatch<SetStateAction<boolean>>,
) => {
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (blocked) return;

      const element = event.target instanceof HTMLElement ? event.target : null;
      const typing =
        element &&
        (element.tagName === "TEXTAREA" ||
          element.tagName === "INPUT" ||
          element.isContentEditable);

      if (typing) return;

      const text = event.clipboardData?.getData("text") ?? "";
      const parsed = logFromClipboard(text);

      if (!parsed) {
        if (source === "link" && text.trim()) setLinkError(true);
        return;
      }

      event.preventDefault();
      setLinkError(false);
      navigate(logResultsPath(parsed));
    };

    window.addEventListener("paste", onPaste);

    return () => window.removeEventListener("paste", onPaste);
  }, [blocked, navigate, setLinkError, source]);
};
