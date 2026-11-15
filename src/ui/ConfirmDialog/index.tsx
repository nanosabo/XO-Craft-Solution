import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import classNames from "classnames";
import {
  finishConfirm,
  subscribeConfirm,
  type ConfirmRequest,
} from "./confirmDialog";
import styles from "./ConfirmDialog.module.scss";

type Pending = ConfirmRequest & {
  resolve: (accepted: boolean) => void;
};

const ConfirmDialogHost = () => {
  const { t } = useTranslation("common");
  const [request, setRequest] = useState<Pending | null>(null);

  useEffect(() => subscribeConfirm(setRequest), []);

  useEffect(() => {
    if (!request) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        request.resolve(false);
        setRequest(null);
        finishConfirm();
      }
    };

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);
  }, [request]);

  if (!request) return null;

  const close = (accepted: boolean) => {
    request.resolve(accepted);
    setRequest(null);
    finishConfirm();
  };

  return createPortal(
    <div
      className={styles.root}
      onMouseDown={() => close(false)}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-dialog-title">{request.title}</h2>
        <p>{request.message}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancel}
            autoFocus
            onClick={() => close(false)}
          >
            {request.cancelLabel ?? t("cancel")}
          </button>
          <button
            type="button"
            className={classNames(styles.confirm, {
              [styles.danger]: request.tone !== "primary",
            })}
            onClick={() => close(true)}
          >
            {request.confirmLabel ?? t("confirm")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ConfirmDialogHost;
