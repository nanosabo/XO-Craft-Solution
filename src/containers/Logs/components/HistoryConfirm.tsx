import { createPortal } from "react-dom";
import type { TFunction } from "i18next";
import type { HistoryConfirm as Confirm } from "../hooks/useLogHistory";
import styles from "../styles/Logs.module.scss";

type Props = {
  t: TFunction;
  confirm: Confirm;
  onCancel: () => void;
  onConfirm: () => void;
};

const HistoryConfirm = ({ t, confirm, onCancel, onConfirm }: Props) =>
  createPortal(
    <div className={styles.confirmRoot} onMouseDown={onCancel}>
      <div
        className={styles.confirmDialog}
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2>
          {confirm.kind === "clear"
            ? t("history.confirmClearTitle")
            : t("history.confirmRemoveTitle")}
        </h2>
        <p>
          {confirm.kind === "clear"
            ? t("history.confirmClear")
            : t("history.confirmRemove", { name: confirm.name })}
        </p>
        <div className={styles.confirmActions}>
          <button type="button" className={styles.secondaryButton} onClick={onCancel}>
            {t("history.cancel")}
          </button>
          <button type="button" className={styles.dangerButton} onClick={onConfirm}>
            {confirm.kind === "clear" ? t("history.clear") : t("history.remove")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );

export default HistoryConfirm;
