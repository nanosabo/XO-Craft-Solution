import { AnimatePresence, motion } from "framer-motion";
import styles from "./styles/UpdateModal.module.scss";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { logWarning } from "@src/helpers/errorLog";
import {
  fetchRelease,
  fetchReleaseFor,
  saveCurrentVersion,
  showVersion,
  subscribeReleasePreview,
} from "@src/helpers/release_notes";
import { selectUpdaterState } from "@src/store/slices/updater.slice";
import { useAppSelector } from "@src/store/store";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import "github-markdown-css/github-markdown-dark.css";
import { ChevronIcon } from "@src/ui/icons";

const RETRY_DELAYS = [5000, 15000];

const UpdateModal = () => {
  const { t } = useTranslation("updater");
  const location = useLocation();
  const update = useAppSelector(selectUpdaterState);
  const [pending, setPending] = useState(false);
  const [version, setVersion] = useState("2.0");
  const [body, setBody] = useState("");
  const [isHtml, setIsHtml] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<string | null>(null);
  const [previewBody, setPreviewBody] = useState("");
  const [previewHtml, setPreviewHtml] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<
    "loading" | "ready" | "empty"
  >("loading");
  const onLoadingScreen = location.pathname === "/loading";
  const showingPreview = Boolean(previewVersion) && !onLoadingScreen;
  const open = showingPreview || (pending && !onLoadingScreen);
  const shownVersion = previewVersion ?? version;
  const shownBody = showingPreview ? previewBody : body;
  const shownHtml = showingPreview ? previewHtml : isHtml;

  useEffect(() => {
    window.electronAPI
      .getVersion()
      .then(setVersion)
      .catch((error) => logWarning("version", error));
  }, []);

  useEffect(() => {
    showVersion()
      .then(setPending)
      .catch((error) => logWarning("update", error));
  }, []);

  useEffect(() => subscribeReleasePreview(setPreviewVersion), []);

  useEffect(() => {
    if (!previewVersion) return;

    let cancelled = false;
    const cached =
      update.latestVersion === previewVersion ? update.releaseNotes : null;

    setPreviewStatus(cached ? "ready" : "loading");
    setPreviewBody(cached ?? "");
    setPreviewHtml(cached ? /<\/?[a-z][\s\S]*>/i.test(cached) : false);

    fetchReleaseFor(previewVersion)
      .then((notes) => {
        if (cancelled) return;

        if (notes) {
          setPreviewBody(notes.body);
          setPreviewHtml(notes.html);
          setPreviewStatus("ready");
          return;
        }

        if (!cached) setPreviewStatus("empty");
      })
      .catch((error) => {
        logWarning("update-notes", error);
        if (!cancelled && !cached) setPreviewStatus("empty");
      });

    return () => {
      cancelled = true;
    };
  }, [previewVersion, update.latestVersion, update.releaseNotes]);

  useEffect(() => {
    if (!pending) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Right after an update the network may not be ready yet, so give the
    // release notes a couple of extra attempts before giving up.
    const load = (attempt: number) => {
      fetchRelease()
        .then((notes) => {
          if (cancelled) return;

          if (notes) {
            setBody(notes.body);
            setIsHtml(notes.html);
            return;
          }

          const delay = RETRY_DELAYS[attempt];

          if (delay != null) {
            timer = setTimeout(() => load(attempt + 1), delay);
          }
        })
        .catch((error) => logWarning("update-notes", error));
    };

    load(0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pending]);

  const onClose = () => {
    if (previewVersion) {
      setPreviewVersion(null);
      return;
    }

    saveCurrentVersion()
      .then(() => setPending(false))
      .catch((error) => {
        logWarning("update", error);
        setPending(false);
      });
  };

  return (
    <AnimatePresence>
      {open && (showingPreview || shownBody.length > 0) && (
        <motion.div
          className={styles.root}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
        >
          <div className={styles.container}>
            <h1>
              Обновление <span>v{shownVersion}</span>
            </h1>

            <button className={styles.chevron} onClick={onClose}>
              <ChevronIcon />
            </button>

            <div className="markdown-body">
              {showingPreview && previewStatus === "loading" && (
                <p className={styles.status}>{t("notes.loading")}</p>
              )}
              {showingPreview && previewStatus === "empty" && (
                <p className={styles.status}>{t("notes.empty")}</p>
              )}
              {shownBody &&
                (shownHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: shownBody }} />
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                  >
                    {shownBody}
                  </ReactMarkdown>
                ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpdateModal;
