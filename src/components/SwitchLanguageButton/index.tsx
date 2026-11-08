import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import classNames from "classnames";
import useLanguageControl from "@src/hooks/useLanguageControl";
import type { UiLanguage } from "@src/helpers/contentLanguage";
import styles from "./styles/SwitchLanguageButton.module.scss";

const languages: { id: UiLanguage; code: string; name: string }[] = [
  { id: "ru", code: "RU", name: "Русский" },
  { id: "uk", code: "UK", name: "Українська" },
  { id: "en", code: "EN", name: "English" },
];

const SwitchLanguageButton = () => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { langLabel, changeLanguage, currentLanguage } = useLanguageControl();
  const { t } = useTranslation("navigation");

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={classNames(styles.trigger, { [styles.open]: open })}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t("lang")}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.code}>{langLabel}</span>
        <span className={styles.caret} aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          {languages.map((language) => (
            <button
              key={language.id}
              type="button"
              role="menuitemradio"
              aria-checked={language.id === currentLanguage}
              className={classNames(styles.option, {
                [styles.active]: language.id === currentLanguage,
              })}
              onClick={() => {
                changeLanguage(language.id);
                setOpen(false);
              }}
            >
              <span className={styles.optionCode}>{language.code}</span>
              <span className={styles.optionName}>{language.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SwitchLanguageButton;
