import classNames from "classnames";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { logWarning } from "@src/helpers/errorLog";
import useScrollFade from "@src/hooks/useScrollFade";
import {
  CROSSOUT_BATTLE_TYPES,
  CROSSOUT_MAPS,
  type CrossoutBattle,
  type CrossoutBattleType,
  type CrossoutErrorCode,
} from "@src/types/crossout";
import Input from "@src/ui/Input";
import Select from "@src/ui/Select";
import styles from "./styles/Logs.module.scss";

const SITE_URL = "https://crossout-info.com";
const MAX_RANGE_DAYS = 7;

const pad = (value: number) => String(value).padStart(2, "0");

const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const toApiDate = (iso: string): string => {
  const [year, month, day] = iso.split("-");

  return `${day}.${month}.${year}`;
};

const parseIsoDate = (iso: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

const rangeInDays = (from: Date, to: Date): number =>
  Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;

const today = new Date();
const DEFAULT_TO = toIsoDate(today);
const DEFAULT_FROM = toIsoDate(
  new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6),
);

const fileName = (filePath: string): string =>
  filePath.split(/[\\/]/).pop() || filePath;

const normalizeMap = (value: string): string =>
  value.trim().toLowerCase().replace(/[\s-]+/g, "_");

type LogsError = {
  code?: CrossoutErrorCode | null;
  message?: string | null;
  fallbackKey?:
    | "stats.error"
    | "stats.dateError"
    | "stats.rangeError"
    | "upload.error";
};

const Logs = () => {
  const { t, i18n } = useTranslation("logsPage");
  const isRu = Boolean(i18n.language?.startsWith("ru"));
  const numberLocale = isRu ? "ru-RU" : "en-US";
  const contentRef = useRef<HTMLDivElement>(null);
  const fade = useScrollFade(contentRef);

  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [keyValue, setKeyValue] = useState("");
  const [keySaving, setKeySaving] = useState(false);
  const [keyStatus, setKeyStatus] = useState<"idle" | "saved" | "invalid">(
    "idle",
  );

  const [filePath, setFilePath] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<LogsError | null>(null);
  const [logLink, setLogLink] = useState<string | null>(null);

  const [battleType, setBattleType] = useState<CrossoutBattleType>("PVP");
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [excludeMap, setExcludeMap] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [fetchError, setFetchError] = useState<LogsError | null>(null);
  const [battles, setBattles] = useState<CrossoutBattle[]>([]);

  useEffect(() => {
    let cancelled = false;

    window.electronAPI
      .crossoutHasApiKey()
      .then((value) => {
        if (cancelled) return;

        setHasKey(value);
        setShowKeyForm(!value);
      })
      .catch((error) => {
        if (cancelled) return;

        logWarning("crossout-key", error);
        setHasKey(false);
        setShowKeyForm(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const typeOptions = useMemo(
    () =>
      CROSSOUT_BATTLE_TYPES.map((option) => ({
        value: option.value,
        label: t(`types.${option.value}`),
      })),
    [t],
  );

  const mapOptions = useMemo(
    () => [
      { value: "", label: t("stats.anyMap") },
      ...CROSSOUT_MAPS.map((option) => ({
        value: option.value,
        label: isRu ? option.ru : option.en,
      })),
    ],
    [t, isRu],
  );

  const sortedBattles = useMemo(
    () => [...battles].sort((a, b) => b.date - a.date),
    [battles],
  );

  const summary = useMemo(() => {
    if (battles.length === 0) return null;

    const total = battles.length;
    const sum = (pick: (battle: CrossoutBattle) => number) =>
      battles.reduce((acc, battle) => acc + pick(battle), 0);
    const wins = battles.filter((battle) => battle.win === 1).length;

    return {
      total,
      winrate: Math.round((wins / total) * 100),
      damage: Math.round(sum((battle) => battle.damage) / total),
      important: Math.round(sum((battle) => battle.important) / total),
      score: Math.round(sum((battle) => battle.score) / total),
      kills: sum((battle) => battle.kill),
      deaths: sum((battle) => battle.death),
      time: sum((battle) => battle.timebattle),
    };
  }, [battles]);

  const formatNumber = (value: number) => value.toLocaleString(numberLocale);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = Math.floor(seconds % 60);

    return hours > 0
      ? `${hours}:${pad(minutes)}:${pad(rest)}`
      : `${minutes}:${pad(rest)}`;
  };

  const formatDate = (unix: number) =>
    new Date(unix * 1000).toLocaleString(numberLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const typeLabel = (type: string) => {
    const key = type.toUpperCase();
    const known = CROSSOUT_BATTLE_TYPES.some((option) => option.value === key);

    return known ? t(`types.${key}`) : type;
  };

  const mapLabel = (map: string) => {
    if (!map) return "";

    const normalized = normalizeMap(map);
    const option = CROSSOUT_MAPS.find(
      (item) =>
        item.value === normalized ||
        normalizeMap(item.ru) === normalized ||
        normalizeMap(item.en) === normalized,
    );

    if (!option) return map;

    return isRu ? option.ru : option.en;
  };

  const errorText = (error: LogsError) => {
    if (
      error.code &&
      i18n.exists(`errors.${error.code}`, { ns: "logsPage" })
    ) {
      return t(`errors.${error.code}`);
    }

    return error.fallbackKey
      ? t(error.fallbackKey)
      : error.message || t("stats.error");
  };

  const saveKey = async () => {
    const value = keyValue.trim();

    if (!value) return;

    setKeySaving(true);
    setKeyStatus("idle");

    try {
      const ok = await window.electronAPI.crossoutSetApiKey(value);

      if (ok) {
        setHasKey(true);
        setShowKeyForm(false);
        setKeyValue("");
        setKeyStatus("saved");
      } else {
        setKeyStatus("invalid");
      }
    } catch (error) {
      logWarning("crossout-key", error);
      setKeyStatus("invalid");
    } finally {
      setKeySaving(false);
    }
  };

  const pickFile = async () => {
    try {
      const selected = await window.electronAPI.crossoutPickLog();

      if (!selected) return;

      setFilePath(selected);
      setUploadError(null);
      setLogLink(null);
    } catch (error) {
      logWarning("crossout-upload", error);
    }
  };

  const upload = async () => {
    if (!filePath) return;

    setUploading(true);
    setUploadError(null);
    setLogLink(null);

    try {
      const result = await window.electronAPI.crossoutUploadLog({
        nickname: nickname.trim(),
        filePath,
      });

      if (result.ok) {
        setLogLink(result.logUrl ?? `${SITE_URL}/log/${result.logId}`);
      } else {
        setUploadError({
          code: result.errorCode,
          message: result.error,
          fallbackKey: "upload.error",
        });
      }
    } catch (error) {
      logWarning("crossout-upload", error);
      setUploadError({ fallbackKey: "upload.error" });
    } finally {
      setUploading(false);
    }
  };

  const fetchBattles = async () => {
    const fromDate = parseIsoDate(from);
    const toDate = parseIsoDate(to);

    if (!fromDate || !toDate) {
      setFetchError({ fallbackKey: "stats.dateError" });
      return;
    }

    if (
      toDate.getTime() < fromDate.getTime() ||
      rangeInDays(fromDate, toDate) > MAX_RANGE_DAYS
    ) {
      setFetchError({ fallbackKey: "stats.rangeError" });
      return;
    }

    setFetching(true);
    setFetchError(null);

    try {
      const result = await window.electronAPI.crossoutFetchBattles({
        type: battleType,
        from: toApiDate(from),
        to: toApiDate(to),
        excludeMap: excludeMap || undefined,
      });

      if (result.error) {
        setBattles([]);
        setFetchError({
          code: result.errorCode,
          message: result.error,
          fallbackKey: "stats.error",
        });
      } else {
        setBattles(result.battles);
      }

      setFetched(true);
    } catch (error) {
      logWarning("crossout-battles", error);
      setBattles([]);
      setFetchError({ fallbackKey: "stats.error" });
      setFetched(true);
    } finally {
      setFetching(false);
    }
  };

  return (
    <div
      ref={contentRef}
      className={classNames(styles.root, {
        [styles.fadeTop]: fade.top,
        [styles.fadeBottom]: fade.bottom,
      })}
    >
      <div className={styles.heading}>
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </div>

      {(hasKey === false || showKeyForm) && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>{t("apiKey.title")}</h2>
            <p>{t("apiKey.description")}</p>
          </div>

          <div className={styles.keyRow}>
            <Input
              type="password"
              value={keyValue}
              onChange={(event) => setKeyValue(event.target.value)}
              placeholder={t("apiKey.placeholder")}
              aria-label={t("apiKey.placeholder")}
            />

            <button
              type="button"
              className={styles.primaryButton}
              onClick={saveKey}
              disabled={keySaving || !keyValue.trim()}
            >
              {t("apiKey.save")}
            </button>

            {hasKey && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setShowKeyForm(false);
                  setKeyStatus("idle");
                  setKeyValue("");
                }}
              >
                {t("apiKey.cancel")}
              </button>
            )}
          </div>

        </section>
      )}

      {keyStatus === "saved" && (
        <p className={styles.success}>{t("apiKey.saved")}</p>
      )}
      {keyStatus === "invalid" && (
        <p className={styles.error}>{t("apiKey.invalid")}</p>
      )}

      {hasKey && !showKeyForm && (
        <div className={styles.keyConfigured}>
          <span>{t("apiKey.configured")}</span>
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => setShowKeyForm(true)}
          >
            {t("apiKey.change")}
          </button>
        </div>
      )}

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>{t("upload.title")}</h2>
          <p>{t("upload.subtitle")}</p>
        </div>

        <div className={styles.uploadRow}>
          <button
            type="button"
            className={styles.fileButton}
            onClick={pickFile}
            title={filePath ?? t("upload.pick")}
          >
            {filePath ? fileName(filePath) : t("upload.pick")}
          </button>

          <Input
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder={t("upload.nicknamePlaceholder")}
            aria-label={t("upload.nickname")}
          />

          <button
            type="button"
            className={styles.primaryButton}
            onClick={upload}
            disabled={uploading || !filePath}
          >
            {uploading ? t("upload.uploading") : t("upload.upload")}
          </button>
        </div>

        {uploadError && (
          <p className={styles.error}>{errorText(uploadError)}</p>
        )}

        {logLink && (
          <p className={styles.success}>
            {t("upload.success")}.{" "}
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => void window.electronAPI.openExternal(logLink)}
            >
              {t("upload.openLog")}
            </button>
          </p>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>{t("stats.title")}</h2>
          <p>{t("stats.subtitle")}</p>
        </div>

        <div className={styles.filters}>
          <label className={styles.field}>
            <span>{t("stats.type")}</span>
            <Select
              options={typeOptions}
              defaultValue={battleType}
              onChange={(value) => setBattleType(value as CrossoutBattleType)}
            />
          </label>

          <label className={styles.field}>
            <span>{t("stats.from")}</span>
            <input
              className={styles.date}
              type="date"
              value={from}
              max={to}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>{t("stats.to")}</span>
            <input
              className={styles.date}
              type="date"
              value={to}
              min={from}
              max={DEFAULT_TO}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>

          <label className={classNames(styles.field, styles.mapField)}>
            <span>{t("stats.excludeMap")}</span>
            <Select
              options={mapOptions}
              defaultValue=""
              onChange={setExcludeMap}
            />
          </label>

          <button
            type="button"
            className={styles.primaryButton}
            onClick={fetchBattles}
            disabled={fetching || hasKey === false}
          >
            {fetching ? t("stats.fetching") : t("stats.fetch")}
          </button>
        </div>

        {fetchError && <p className={styles.error}>{errorText(fetchError)}</p>}

        {summary && (
          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <span>{t("summary.battles")}</span>
              <strong>{formatNumber(summary.total)}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span>{t("summary.winrate")}</span>
              <strong>{summary.winrate}%</strong>
            </div>
            <div className={styles.summaryCard}>
              <span>{t("summary.damage")}</span>
              <strong>{formatNumber(summary.damage)}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span>{t("summary.important")}</span>
              <strong>{formatNumber(summary.important)}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span>{t("summary.score")}</span>
              <strong>{formatNumber(summary.score)}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span>{t("summary.kills")}</span>
              <strong>{formatNumber(summary.kills)}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span>{t("summary.deaths")}</span>
              <strong>{formatNumber(summary.deaths)}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span>{t("summary.time")}</span>
              <strong>{formatDuration(summary.time)}</strong>
            </div>
          </div>
        )}

        {fetched && !fetching && !fetchError && battles.length === 0 && (
          <p className={styles.empty}>{t("stats.empty")}</p>
        )}

        {sortedBattles.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("table.date")}</th>
                  <th>{t("table.type")}</th>
                  <th>{t("table.map")}</th>
                  <th>{t("table.result")}</th>
                  <th>{t("table.damage")}</th>
                  <th>{t("table.important")}</th>
                  <th>{t("table.kills")}</th>
                  <th>{t("table.score")}</th>
                  <th>{t("table.ps")}</th>
                  <th>{t("table.duration")}</th>
                  <th>{t("table.weapon")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedBattles.map((battle) => (
                  <tr key={`${battle.battle_id}-${battle.date}-${battle.teams}`}>
                    <td>{formatDate(battle.date)}</td>
                    <td>{typeLabel(battle.type)}</td>
                    <td className={styles.mapCell} title={battle.map}>
                      {mapLabel(battle.map)}
                    </td>
                    <td
                      className={classNames(
                        battle.win === 1 ? styles.win : styles.loss,
                      )}
                    >
                      {battle.win === 1 ? t("table.win") : t("table.loss")}
                    </td>
                    <td>{formatNumber(battle.damage)}</td>
                    <td>{formatNumber(battle.important)}</td>
                    <td>
                      {battle.kill}/{battle.death}
                    </td>
                    <td>{formatNumber(battle.score)}</td>
                    <td>{formatNumber(battle.ur)}</td>
                    <td>{formatDuration(battle.timebattle)}</td>
                    <td className={styles.weaponCell} title={battle.weapon}>
                      {battle.weapon}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default Logs;
