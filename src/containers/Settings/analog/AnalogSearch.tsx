import { FC } from "react";
import { useTranslation } from "react-i18next";
import Input from "@src/ui/Input";
import PartImage from "../components/PartImage";
import PartStats from "../components/PartStats";
import SettingsSection from "../components/SettingsSection";
import { getPartName, Part } from "../types";
import styles from "../styles/Settings.module.scss";

interface Props {
  query: string;
  results: Part[];
  isLoading: boolean;
  error: boolean;
  onQueryChange: (query: string) => void;
  onSelect: (part: Part) => void;
}

const AnalogSearch: FC<Props> = ({
  query,
  results,
  isLoading,
  error,
  onQueryChange,
  onSelect,
}) => {
  const { t, i18n } = useTranslation("settingsPage");

  return (
    <SettingsSection title={t("analog.find")} subtitle={t("analog.findHint")}>
      {isLoading && <p className={styles.muted}>{t("analog.loading")}</p>}
      {error && <p className={styles.statusError}>{t("analog.error")}</p>}

      {!isLoading && !error && (
        <>
          <div className={styles.searchField}>
            <Input
              type="search"
              value={query}
              placeholder={t("analog.search")}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </div>

          {query.trim().length > 0 && results.length === 0 && (
            <p className={styles.muted}>{t("inventory.notFound")}</p>
          )}

          {results.length > 0 && (
            <div className={styles.searchResults}>
              {results.map((part) => (
                <button
                  key={part.id}
                  type="button"
                  className={styles.searchResult}
                  onClick={() => onSelect(part)}
                >
                  <PartImage id={part.id} />
                  <span>
                    <p>{getPartName(part, i18n.language)}</p>
                    <PartStats part={part} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </SettingsSection>
  );
};

export default AnalogSearch;
