import classNames from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { logWarning } from "@src/helpers/errorLog";
import useScrollFade from "@src/hooks/useScrollFade";
import { CloseIcon } from "@src/ui/icons";
import launcherShot1 from "@src/assets/images/log-help/1shag.png";
import launcherShot2 from "@src/assets/images/log-help/2shag.png";
import launcherShot3 from "@src/assets/images/log-help/3shag.png";
import steamShot1 from "@src/assets/images/log-help/steamImg1.png";
import steamShot2 from "@src/assets/images/log-help/steamImg2.png";
import styles from "./styles/Logs.module.scss";

type Platform = "launcher" | "steam";

const STEP_IMAGES: Record<Platform, Array<string | null>> = {
  launcher: [launcherShot1, launcherShot2, null, launcherShot3],
  steam: [steamShot1, steamShot2, null, launcherShot3],
};

interface HelpStep {
  title: string;
  text: string;
  command?: boolean;
}

const isHelpStep = (value: unknown): value is HelpStep => {
  if (!value || typeof value !== "object") return false;

  const step = value as HelpStep;

  return typeof step.title === "string" && typeof step.text === "string";
};

interface Props {
  open: boolean;
  onClose: () => void;
}

const LogHelpModal = ({ open, onClose }: Props) => {
  const { t } = useTranslation("logsPage");
  const [platform, setPlatform] = useState<Platform>("launcher");
  const [stepIndex, setStepIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const stepRef = useRef<HTMLDivElement>(null);
  const fade = useScrollFade(stepRef);

  const rawSteps = t(`upload.help.${platform}Steps`, {
    returnObjects: true,
  });
  const steps = Array.isArray(rawSteps) ? rawSteps.filter(isHelpStep) : [];
  const step = steps[stepIndex];
  const last = stepIndex >= steps.length - 1;

  useEffect(() => {
    if (!open) return;

    setPlatform("launcher");
    setStepIndex(0);
    setCopied(false);
  }, [open]);

  useEffect(() => {
    const element = stepRef.current;

    if (!element) return;

    element.scrollTop = 0;
    requestAnimationFrame(() => {
      element.dispatchEvent(new Event("scroll"));
    });
  }, [open, platform, stepIndex]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const choosePlatform = (next: Platform) => {
    setPlatform(next);
    setStepIndex(0);
    setCopied(false);
  };

  const copyCommand = async () => {
    try {
      await window.electronAPI.copyText(t("upload.help.command"));
      setCopied(true);
    } catch (error) {
      logWarning("crossout-help", error);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.helpRoot}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            className={styles.helpDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-help-title"
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ duration: 0.18 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.helpHeader}>
              <div>
                <h2 id="log-help-title">{t("upload.help.title")}</h2>
                <p>{t("upload.help.hint")}</p>
              </div>
              <button
                type="button"
                className={styles.helpClose}
                onClick={onClose}
                aria-label={t("upload.help.close")}
              >
                <CloseIcon />
              </button>
            </div>

            <div className={styles.helpPlatforms} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={platform === "launcher"}
                className={classNames(styles.helpPlatform, {
                  [styles.helpPlatformActive]: platform === "launcher",
                })}
                onClick={() => choosePlatform("launcher")}
              >
                {t("upload.help.launcher")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={platform === "steam"}
                className={classNames(styles.helpPlatform, {
                  [styles.helpPlatformActive]: platform === "steam",
                })}
                onClick={() => choosePlatform("steam")}
              >
                {t("upload.help.steam")}
              </button>
            </div>

            <div className={styles.helpStepper} aria-hidden="true">
              {steps.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  className={classNames(styles.helpDot, {
                    [styles.helpDotActive]: index === stepIndex,
                    [styles.helpDotDone]: index < stepIndex,
                  })}
                  onClick={() => {
                    setStepIndex(index);
                    setCopied(false);
                  }}
                >
                  <span>{index + 1}</span>
                  {index < steps.length - 1 && <i />}
                </button>
              ))}
            </div>

            {step && (
              <div
                ref={stepRef}
                className={classNames(styles.helpStep, {
                  [styles.fadeTop]: fade.top,
                  [styles.fadeBottom]: fade.bottom,
                })}
              >
                <span className={styles.helpStepCount}>
                  {t("upload.help.progress", {
                    current: stepIndex + 1,
                    total: steps.length,
                  })}
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                {step.command && (
                  <div className={styles.helpCommand}>
                    <code>{t("upload.help.command")}</code>
                    <button type="button" onClick={() => void copyCommand()}>
                      {copied ? t("upload.help.copied") : t("upload.help.copy")}
                    </button>
                  </div>
                )}
                {STEP_IMAGES[platform][stepIndex] && (
                  <div className={styles.helpShotFrame}>
                    <img
                      className={styles.helpShot}
                      src={STEP_IMAGES[platform][stepIndex] ?? undefined}
                      alt=""
                    />
                  </div>
                )}
              </div>
            )}

            <div className={styles.helpFooter}>
            <p className={styles.helpNote}>{t("upload.help.note")}</p>

            <div className={styles.helpActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setCopied(false);
                  setStepIndex((index) => Math.max(0, index - 1));
                }}
                disabled={stepIndex === 0}
              >
                {t("upload.help.back")}
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  setCopied(false);

                  if (last) {
                    onClose();
                    return;
                  }

                  setStepIndex((index) => index + 1);
                }}
              >
                {last ? t("upload.help.done") : t("upload.help.next")}
              </button>
            </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default LogHelpModal;
