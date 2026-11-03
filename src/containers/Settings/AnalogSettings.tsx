import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@src/store/store";
import { selectSettingsState } from "@src/store/slices/settings.slice";
import SettingsSection from "./components/SettingsSection";
import useParts from "./useParts";
import { matchesPartQuery, Part, sortPartsByName } from "./types";
import AnalogBasePart from "./analog/AnalogBasePart";
import AnalogCriteria from "./analog/AnalogCriteria";
import AnalogMatches from "./analog/AnalogMatches";
import AnalogSearch from "./analog/AnalogSearch";
import { getAnalogMatches } from "./analog/helpers";
import styles from "./styles/Settings.module.scss";

const AnalogSettings = () => {
  const { t, i18n } = useTranslation("settingsPage");
  const { analog } = useAppSelector(selectSettingsState);
  const { parts, isLoading, error } = useParts();

  const [query, setQuery] = useState("");
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const basePartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedPartId) return;

    basePartRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [selectedPartId]);

  const selectedPart = useMemo(
    () => parts.find((part) => part.id === selectedPartId) ?? null,
    [parts, selectedPartId],
  );

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    return parts
      .filter((part) => matchesPartQuery(part, query))
      .sort((a, b) => sortPartsByName(a, b, i18n.language))
      .slice(0, 8);
  }, [i18n.language, parts, query]);

  const matches = useMemo(
    () => getAnalogMatches(parts, selectedPart, analog),
    [analog, parts, selectedPart],
  );

  const selectPart = (part: Part) => {
    setSelectedPartId(part.id);
    setQuery("");
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>{t("analog.title")}</h2>
        <p>{t("analog.subtitle")}</p>
      </div>

      <AnalogCriteria analog={analog} />

      {!selectedPart ? (
        <AnalogSearch
          query={query}
          results={searchResults}
          isLoading={isLoading}
          error={error}
          onQueryChange={setQuery}
          onSelect={selectPart}
        />
      ) : (
        <SettingsSection
          title={t("analog.find")}
          subtitle={t("analog.findHint")}
        >
          <AnalogBasePart
            ref={basePartRef}
            part={selectedPart}
            onChange={() => setSelectedPartId(null)}
          />
          <AnalogMatches matches={matches} />
        </SettingsSection>
      )}
    </div>
  );
};

export default AnalogSettings;
