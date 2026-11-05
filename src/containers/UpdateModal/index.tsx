import { AnimatePresence, motion } from "framer-motion";
import styles from "./styles/UpdateModal.module.scss";
import { useEffect, useState } from "react";
import { logWarning } from "@src/helpers/errorLog";
import {
  fetchRelease,
  saveCurrentVersion,
  showVersion,
} from "@src/helpers/release_notes";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import "github-markdown-css/github-markdown-dark.css";
import { ChevronIcon } from "@src/ui/icons";

const RETRY_DELAYS = [5000, 15000];

const UpdateModal = () => {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState("2.0");
  const [body, setBody] = useState("");
  const [isHtml, setIsHtml] = useState(false);

  useEffect(() => {
    window.electronAPI
      .getVersion()
      .then(setVersion)
      .catch((error) => logWarning("version", error));
  }, []);

  useEffect(() => {
    showVersion()
      .then(setOpen)
      .catch((error) => logWarning("update", error));
  }, []);

  useEffect(() => {
    if (!open) return;

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
  }, [open]);

  const onClose = () => {
    saveCurrentVersion()
      .then(() => setOpen(false))
      .catch((error) => {
        logWarning("update", error);
        setOpen(false);
      });
  };

  return (
    <AnimatePresence>
      {open && body.length > 0 && (
        <motion.div
          className={styles.root}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
        >
          <div className={styles.container}>
            <h1>
              Обновление <span>v{version}</span>
            </h1>

            <button className={styles.chevron} onClick={onClose}>
              <ChevronIcon />
            </button>

            <div className="markdown-body">
              {isHtml ? (
                <div dangerouslySetInnerHTML={{ __html: body }} />
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {body}
                </ReactMarkdown>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpdateModal;
