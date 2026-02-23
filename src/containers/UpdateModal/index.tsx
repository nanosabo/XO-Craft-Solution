import { AnimatePresence, motion } from "framer-motion";
import styles from "./styles/UpdateModal.module.scss";
import { useEffect, useState } from "react";
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

const UpdateModal = () => {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState("2.0");
  const [body, setBody] = useState("");

  useEffect(() => {
    window.electronAPI.getVersion().then(setVersion);
  }, []);

  useEffect(() => {
    showVersion().then(setOpen);
  }, []);

  useEffect(() => {
    if (open) {
      fetchRelease().then((data) => setBody(data.body));
    }
  }, [open]);

  const onClose = () => {
    saveCurrentVersion().then(() => setOpen(false));
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
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              >
                {body}
              </ReactMarkdown>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpdateModal;
