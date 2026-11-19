import classNames from "classnames";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { normalizeUiLanguage } from "@src/helpers/contentLanguage";
import useScrollFade from "@src/hooks/useScrollFade";
import { selectSettingsState } from "@src/store/slices/settings.slice";
import { useAppSelector } from "@src/store/store";
import HistoryConfirm from "./components/HistoryConfirm";
import LogGuide from "./components/LogGuide";
import LogHelpModal from "./components/LogHelpModal";
import LogHistory from "./components/LogHistory";
import UploadCard from "./components/UploadCard";
import { numberLocale } from "./helpers/labels";
import { useLatestLog } from "./hooks/useLatestLog";
import { useLogHistory } from "./hooks/useLogHistory";
import { useLogPaste } from "./hooks/useLogPaste";
import { useLogUpload } from "./hooks/useLogUpload";
import styles from "./styles/Logs.module.scss";

const Logs = () => {
  const { t, i18n } = useTranslation("logsPage");
  const navigate = useNavigate();
  const logsPath = useAppSelector(selectSettingsState).crossoutLogsPath;
  const locale = numberLocale(normalizeUiLanguage(i18n.language));
  const contentRef = useRef<HTMLDivElement>(null);
  const fade = useScrollFade(contentRef);
  const [source, setSource] = useState<"file" | "link">("file");
  const [linkError, setLinkError] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const latestLog = useLatestLog(logsPath);
  const upload = useLogUpload(navigate);
  const history = useLogHistory();

  useLogPaste(navigate, source, helpOpen || history.confirm != null, setLinkError);

  return (
    <div
      ref={contentRef}
      className={classNames(styles.root, {
        [styles.fadeTop]: fade.top,
        [styles.fadeBottom]: fade.bottom,
      })}
    >
      <div className={styles.heading}>
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </div>
      <div className={styles.workspace}>
        <UploadCard
          t={t}
          i18n={i18n}
          uploading={upload.uploading}
          source={source}
          latestLog={latestLog}
          logsPath={logsPath}
          filePath={upload.filePath}
          locale={locale}
          progress={upload.uploadProgress}
          uploadError={upload.uploadError}
          linkError={linkError}
          onSource={(next) => {
            if (next === "link") setLinkError(false);
            setSource(next);
          }}
          onSettings={() => navigate("/settings")}
          onUpload={(path) => {
            upload.setFilePath(path);
            void upload.upload(path);
          }}
          onPick={() => void upload.pickFile()}
        />
        <LogGuide t={t} onHelp={() => setHelpOpen(true)} />
        <LogHistory
          t={t}
          i18n={i18n}
          locale={locale}
          history={history.history}
          visibleCount={history.visibleHistory?.length ?? 0}
          rows={history.rows}
          historyError={history.historyError}
          historyDate={history.historyDate}
          page={history.page}
          pageCount={history.pageCount}
          onDate={(value) => {
            history.setHistoryDate(value);
            history.setHistoryPage(1);
          }}
          onResetDate={() => {
            history.setHistoryDate("");
            history.setHistoryPage(1);
          }}
          onClear={() => history.setConfirm({ kind: "clear" })}
          onPage={history.setHistoryPage}
          onOpen={(logId) => navigate(`/logs/${logId}`)}
          onRemove={(id, name) => history.setConfirm({ kind: "remove", id, name })}
        />
      </div>
      <LogHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      {history.confirm && (
        <HistoryConfirm
          t={t}
          confirm={history.confirm}
          onCancel={() => history.setConfirm(null)}
          onConfirm={history.confirmHistory}
        />
      )}
    </div>
  );
};

export default Logs;
