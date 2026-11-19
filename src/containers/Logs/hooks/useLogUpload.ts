import { useEffect, useRef, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { logWarning } from "@src/helpers/errorLog";
import type { CrossoutUploadProgress } from "@src/types/crossout";
import { isCombatLogName } from "../helpers/paths";
import type { LogsError } from "../helpers/labels";

export const useLogUpload = (navigate: NavigateFunction) => {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<CrossoutUploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<LogsError | null>(null);
  const uploadingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    return window.electronAPI.onCrossoutUploadProgress((progress) => {
      if (!uploadingRef.current) return;

      setUploadProgress(progress);
    });
  }, []);

  const upload = async (selectedPath: string) => {
    if (!selectedPath || uploadingRef.current) return;

    uploadingRef.current = true;
    setUploading(true);
    setUploadError(null);
    setUploadProgress({
      phase: "uploading",
      percent: 0,
      transferred: 0,
      total: 0,
      bytesPerSecond: 0,
    });

    try {
      const result = await window.electronAPI.crossoutUploadLog({
        nickname: "",
        filePath: selectedPath,
      });

      if (!mountedRef.current) return;

      if (result.ok) {
        navigate(`/logs/${result.logId}`);
        return;
      }

      setUploadError({
        code: result.errorCode,
        message: result.error,
        fallbackKey: "upload.error",
      });
    } catch (error) {
      logWarning("crossout-upload", error);

      if (mountedRef.current) setUploadError({ fallbackKey: "upload.error" });
    } finally {
      uploadingRef.current = false;

      if (mountedRef.current) {
        setUploading(false);
        setUploadProgress(null);
      }
    }
  };

  const pickFile = async () => {
    if (uploadingRef.current) return;

    try {
      const selected = await window.electronAPI.crossoutPickLog();

      if (!selected) return;

      setFilePath(selected);

      if (!isCombatLogName(selected)) {
        setUploadError({ fallbackKey: "upload.wrongFile" });
        setUploadProgress(null);
        return;
      }

      setUploadError(null);
      void upload(selected);
    } catch (error) {
      logWarning("crossout-upload", error);
    }
  };

  return {
    filePath,
    setFilePath,
    uploading,
    uploadProgress,
    uploadError,
    upload,
    pickFile,
  };
};
