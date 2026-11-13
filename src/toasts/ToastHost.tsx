import { useCallback, useEffect, useRef, useState } from "react";
import classNames from "classnames";
import styles from "./ToastHost.module.scss";

const TOAST_TTL = 15000;
const VISIBLE_LIMIT = 4;

interface ToastItem {
  id: string;
  title: string;
  body: string;
  icon?: string;
  closeLabel: string;
  clearLabel: string;
}

interface ShownToast {
  toast: ToastItem;
  leaving: boolean;
}

interface CardProps {
  toast: ToastItem;
  idle: boolean;
  suspended: boolean;
  onDismiss: (id: string) => void;
}

interface SlotProps {
  leaving: boolean;
  onExited: () => void;
  onSettled: () => void;
  children: React.ReactNode;
}

const CloseIcon = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
    <path
      d="M4 4l8 8M12 4l-8 8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const Slot = ({ leaving, onExited, onSettled, children }: SlotProps) => {
  const [open, setOpen] = useState(false);
  const reduceMotion = useRef(
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (reduceMotion.current) {
      setOpen(true);
      return;
    }

    const frame = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (reduceMotion.current && leaving) onExited();
  }, [leaving, onExited]);

  return (
    <div
      className={classNames(styles.slot, {
        [styles.slotOpen]: open && !leaving,
      })}
      onTransitionEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.propertyName !== "grid-template-rows") return;
        onSettled();
        if (leaving) onExited();
      }}
    >
      <div className={styles.clip}>{children}</div>
    </div>
  );
};

const ToastCard = ({ toast, idle, suspended, onDismiss }: CardProps) => {
  const [hover, setHover] = useState(false);
  const paused = hover || idle || suspended;
  const remaining = useRef(TOAST_TTL);
  const started = useRef(0);

  useEffect(() => {
    if (paused) return;

    started.current = Date.now();
    const timer = window.setTimeout(
      () => onDismiss(toast.id),
      remaining.current,
    );

    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(
        0,
        remaining.current - (Date.now() - started.current),
      );
    };
  }, [paused, onDismiss, toast.id]);

  return (
    <article
      className={styles.card}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => {
        if (suspended) return;
        window.electronAPI.focusFromToast();
        onDismiss(toast.id);
      }}
    >
      {toast.icon && (
        <img className={styles.icon} src={toast.icon} alt="" draggable={false} />
      )}
      <div className={styles.text}>
        {toast.title && <p className={styles.title}>{toast.title}</p>}
        {toast.body && <p className={styles.body}>{toast.body}</p>}
      </div>
      <button
        type="button"
        className={styles.close}
        aria-label={toast.closeLabel}
        title={toast.closeLabel}
        onClick={(event) => {
          event.stopPropagation();
          if (suspended) return;
          onDismiss(toast.id);
        }}
      >
        <CloseIcon />
      </button>
    </article>
  );
};

const layoutSlots = (previous: ShownToast[], queue: ToastItem[]): ShownToast[] => {
  const target = queue.slice(-VISIBLE_LIMIT);
  const targetIds = new Set(target.map((item) => item.id));
  const previousIds = new Set(previous.map((slot) => slot.toast.id));
  const next: ShownToast[] = [];
  const placed = new Set<string>();

  const takeNewBefore = (beforeId: string | null) => {
    const limit =
      beforeId === null
        ? target.length
        : target.findIndex((item) => item.id === beforeId);

    for (let index = 0; index < target.length; index += 1) {
      const item = target[index];
      if (placed.has(item.id) || previousIds.has(item.id)) continue;
      if (limit !== -1 && index >= limit) break;

      next.push({ toast: item, leaving: false });
      placed.add(item.id);
    }
  };

  for (const slot of previous) {
    if (targetIds.has(slot.toast.id)) {
      takeNewBefore(slot.toast.id);
      const toast = target.find((item) => item.id === slot.toast.id) ?? slot.toast;
      next.push({ toast, leaving: false });
      placed.add(slot.toast.id);
      continue;
    }

    next.push({ ...slot, leaving: true });
    placed.add(slot.toast.id);
  }

  takeNewBefore(null);
  return next;
};

const ToastHost = () => {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const [shown, setShown] = useState<ShownToast[]>([]);
  const [idle, setIdle] = useState(true);
  const stackRef = useRef<HTMLDivElement>(null);
  const live = shown.some((slot) => !slot.leaving);
  const clearLabel =
    [...shown].reverse().find((slot) => slot.toast.clearLabel)?.toast
      .clearLabel ?? "";

  const dismiss = useCallback((id: string) => {
    setQueue((current) => current.filter((item) => item.id !== id));
  }, []);

  const finishLeave = useCallback((id: string) => {
    setShown((current) => current.filter((slot) => slot.toast.id !== id));
  }, []);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onToast((toast) => {
      setQueue((current) => [
        ...current.filter((item) => item.id !== toast.id),
        toast,
      ]);
    });

    window.electronAPI.notifyToastReady();

    return unsubscribe;
  }, []);

  useEffect(() => {
    setShown((current) => layoutSlots(current, queue));
  }, [queue]);

  const reportHeight = useCallback(() => {
    const node = stackRef.current;

    if (!node || shown.length === 0) {
      window.electronAPI.resizeToast(0);
      return;
    }

    window.electronAPI.resizeToast(Math.ceil(node.scrollHeight));
  }, [shown.length]);

  useEffect(() => {
    if (queue.length === 0 && shown.length === 0) {
      setIdle(true);
      return;
    }

    let cancelled = false;

    const read = () => {
      void window.electronAPI
        .getIdleSeconds()
        .then((seconds) => {
          if (!cancelled) setIdle(seconds >= 1);
        })
        .catch(() => {
          if (!cancelled) setIdle(false);
        });
    };

    read();
    const timer = window.setInterval(read, 500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [queue.length, shown.length]);

  useEffect(() => {
    const node = stackRef.current;

    if (!node || shown.length === 0) {
      window.electronAPI.resizeToast(0);
      return;
    }

    const report = () => {
      window.electronAPI.resizeToast(Math.ceil(node.scrollHeight));
    };

    report();
    const observer = new ResizeObserver(report);
    observer.observe(node);
    const frame = window.requestAnimationFrame(report);
    // The cards open over 240ms. Measure again after that, so a burst of
    // notifications is not left shorter than the stack and the clear button.
    const later = window.setTimeout(report, 280);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.clearTimeout(later);
    };
  }, [shown]);

  return (
    <div className={styles.viewport}>
      <div ref={stackRef} className={styles.stack} role="status" aria-live="polite">
        {shown.map((slot) => (
          <Slot
            key={slot.toast.id}
            leaving={slot.leaving}
            onExited={() => finishLeave(slot.toast.id)}
            onSettled={reportHeight}
          >
            <ToastCard
              toast={slot.toast}
              idle={idle}
              suspended={slot.leaving}
              onDismiss={dismiss}
            />
          </Slot>
        ))}
        {shown.length > 0 && clearLabel && (
          <Slot
            key="clear"
            leaving={!live}
            onExited={() => undefined}
            onSettled={reportHeight}
          >
            <button
              type="button"
              className={styles.clearAll}
              onClick={() => setQueue([])}
            >
              {clearLabel}
            </button>
          </Slot>
        )}
      </div>
    </div>
  );
};

export default ToastHost;
