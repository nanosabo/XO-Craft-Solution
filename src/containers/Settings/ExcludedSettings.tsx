import { useState } from "react";
import { useTranslation } from "react-i18next";
import classNames from "classnames";
import Input from "@src/ui/Input";
import { scheduleSolutionRefresh } from "@src/helpers/scheduleSolutionRefresh";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import { removeInstalledPart, selectLoaderState } from "@src/store/slices/loader.slice";
import { removeRequiredPart } from "@src/store/slices/requiredParts.slice";
import {
  banExcludedPart,
  clearExcludedParts,
  restoreExcludedPart,
  selectSettingsState,
  setConsiderExcludedParts,
} from "@src/store/slices/settings.slice";
import SettingsSection from "./components/SettingsSection";
import Switch from "./components/Switch";
import useParts from "./useParts";
import ExcludedPartRow from "./excluded/ExcludedPartRow";
import useExcludedParts from "./excluded/useExcludedParts";
import styles from "./styles/Settings.module.scss";

const ExcludedSettings = () => {
  const { t, i18n } = useTranslation("settingsPage");
  const dispatch = useAppDispatch();
  const { excludedParts, considerExcludedParts } = useAppSelector(
    selectSettingsState,
  );
  const hasSolution = useAppSelector(
    (state) => selectLoaderState(state).solvedResult != null,
  );
  const { parts, isLoading, error } = useParts();
  const [query, setQuery] = useState("");
  const [onlyExcluded, setOnlyExcluded] = useState(false);
  const { filteredParts, excludedIds, count } = useExcludedParts({
    parts,
    excluded: excludedParts,
    query,
    onlyExcluded,
    language: i18n.language,
  });

  const refresh = () => {
    if (hasSolution) scheduleSolutionRefresh(dispatch);
  };

  const toggle = (id: string, excluded: boolean) => {
    if (excluded) {
      dispatch(restoreExcludedPart(id));
    } else {
      dispatch(banExcludedPart(id));
      dispatch(removeRequiredPart(id));
      dispatch(removeInstalledPart(id));
    }

    refresh();
  };

  const clearAll = () => {
    if (!window.confirm(t("excluded.clearConfirm"))) return;
    dispatch(clearExcludedParts());
    refresh();
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>{t("excluded.title")}</h2>
        <p>{t("excluded.subtitle")}</p>
      </div>

      <SettingsSection
        title={t("excluded.consider")}
        subtitle={t("excluded.considerHint")}
        action={
          <div className={styles.sectionAction}>
            <span
              className={classNames(styles.badge, {
                [styles.badgeActive]: considerExcludedParts,
              })}
            >
              {considerExcludedParts
                ? t("excluded.considerOn")
                : t("excluded.considerOff")}
            </span>
            <Switch
              checked={considerExcludedParts}
              onChange={(enabled) => {
                dispatch(setConsiderExcludedParts(enabled));
                refresh();
              }}
              label={t("excluded.consider")}
            />
          </div>
        }
      >
        <p
          className={classNames(styles.notice, {
            [styles.noticeActive]: considerExcludedParts,
            [styles.noticeMuted]: !considerExcludedParts,
          })}
        >
          {considerExcludedParts
            ? t("excluded.considerOnNotice")
            : t("excluded.considerOffNotice")}
        </p>
      </SettingsSection>

      <SettingsSection
        title={t("excluded.listTitle")}
        subtitle={t("excluded.listHint")}
      >
        <div className={styles.toolbar}>
          <div className={styles.searchField}>
            <Input
              type="search"
              value={query}
              placeholder={t("excluded.search")}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <button
            type="button"
            className={classNames(styles.filterButton, {
              [styles.filterButtonActive]: onlyExcluded,
            })}
            onClick={() => setOnlyExcluded((value) => !value)}
          >
            {t("excluded.onlyHidden")}
            {count > 0 && <span className={styles.filterCount}>{count}</span>}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.dangerButton}`}
            onClick={clearAll}
            disabled={count === 0}
            title={t("excluded.clearHint")}
          >
            {t("excluded.clear")}
          </button>
        </div>

        {isLoading && <p className={styles.muted}>{t("excluded.loading")}</p>}
        {error && <p className={styles.statusError}>{t("excluded.error")}</p>}

        {!isLoading && !error && filteredParts.length === 0 && (
          <p className={styles.muted}>
            {onlyExcluded ? t("excluded.empty") : t("excluded.notFound")}
          </p>
        )}

        {!isLoading && !error && filteredParts.length > 0 && (
          <div className={styles.partList}>
            {filteredParts.map((part) => {
              const excluded = excludedIds.has(part.id);

              return (
                <ExcludedPartRow
                  key={part.id}
                  part={part}
                  excluded={excluded}
                  onToggle={() => toggle(part.id, excluded)}
                />
              );
            })}
          </div>
        )}
      </SettingsSection>
    </div>
  );
};

export default ExcludedSettings;
