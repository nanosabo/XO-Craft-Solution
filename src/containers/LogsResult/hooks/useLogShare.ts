import { useEffect, useRef, useState, type RefObject } from "react";
import { buildAppLogLink } from "@src/helpers/appLogLink";
import { logWarning } from "@src/helpers/errorLog";
import { buildAlliesShot } from "../helpers/alliesShot";
import { siteLogUrl } from "../helpers/siteUrl";

export const useLogShare = (
  shotRef: RefObject<HTMLDivElement>,
  allyTeam: string,
  logId: string,
  logType: string | null,
  isRu: boolean,
) => {
  const [shotBusy, setShotBusy] = useState(false);
  const [shotCopied, setShotCopied] = useState(false);
  const [linksCopied, setLinksCopied] = useState(false);
  const shotTimerRef = useRef<number | null>(null);
  const linksTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (shotTimerRef.current) window.clearTimeout(shotTimerRef.current);
      if (linksTimerRef.current) window.clearTimeout(linksTimerRef.current);
    },
    [],
  );

  const copyScreenshot = async () => {
    const root = shotRef.current;

    if (!root || shotBusy) return;

    setShotBusy(true);

    try {
      const shot = buildAlliesShot(root, allyTeam);

      if (!shot) return;

      const copied = await window.electronAPI.copyTableImage(
        shot.html,
        shot.width,
        shot.height,
      );

      if (!copied) return;

      setShotCopied(true);

      if (shotTimerRef.current) window.clearTimeout(shotTimerRef.current);

      shotTimerRef.current = window.setTimeout(() => {
        setShotCopied(false);
        shotTimerRef.current = null;
      }, 2000);
    } catch (copyError) {
      logWarning("log-shot", copyError);
    } finally {
      setShotBusy(false);
    }
  };

  const copyLinks = async () => {
    const appLink = buildAppLogLink(logId, logType);
    const siteLink = await siteLogUrl(logId, isRu);

    try {
      await window.electronAPI.copyText(`${appLink}\n${siteLink}`);
      setLinksCopied(true);

      if (linksTimerRef.current) window.clearTimeout(linksTimerRef.current);

      linksTimerRef.current = window.setTimeout(() => {
        setLinksCopied(false);
        linksTimerRef.current = null;
      }, 2000);
    } catch (copyError) {
      logWarning("log-links", copyError);
    }
  };

  return { shotBusy, shotCopied, linksCopied, copyScreenshot, copyLinks };
};
