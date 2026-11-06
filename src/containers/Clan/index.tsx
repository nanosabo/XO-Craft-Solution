import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import BattlesView, { type BattlesViewName } from "@src/components/BattlesView";
import type { ClanLog, ClanState } from "@src/types/clan";
import Input from "@src/ui/Input";
import styles from "./styles/Clan.module.scss";

interface Props {
  view: BattlesViewName;
  onView: (view: BattlesViewName) => void;
}

const PAGE = 40;

const relayName = (url: string): string => {
  try {
    return new URL(url).host.replace(/^relay\./, "");
  } catch {
    return url;
  }
};

const profileValue = (profileId: string): string =>
  profileId ? `https://crossout-info.com/pers/${profileId}` : "";

const sameNick = (left: string, right: string): boolean => {
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();

  return Boolean(a) && a === b;
};

const Clan = ({ view, onView }: Props) => {
  const { t, i18n } = useTranslation("logsPage");
  const navigate = useNavigate();
  const [state, setState] = useState<ClanState | null>(null);
  const [profile, setProfile] = useState("");
  const [code, setCode] = useState("");
  const [visible, setVisible] = useState(PAGE);
  const edited = useRef(false);
  const isRu = Boolean(i18n.language?.startsWith("ru"));
  const locale = isRu ? "ru-RU" : "en-US";

  useEffect(() => {
    void window.electronAPI.clanGetState().then((next) => {
      setState(next);

      if (!edited.current) {
        setProfile(profileValue(next.profileId));
        setCode(next.code);
      }
    });

    return window.electronAPI.onClanState((next) => {
      setState(next);
    });
  }, []);

  const logs = state?.logs ?? [];
  const shown = logs.slice(0, visible);
  const mine = logs.filter((log) => sameNick(log.nickname, state?.nickname ?? "")).length;

  const when = (log: ClanLog): string => {
    const ms = log.uploadedAt > 0 ? log.uploadedAt : log.savedAt;

    if (!ms) return "";

    return new Date(ms).toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const statusClass =
    state?.detail === "online"
      ? styles.online
      : state?.detail === "profile-failed" ||
          state?.detail === "bad-profile" ||
          state?.detail === "offline"
        ? styles.bad
        : undefined;

  const statusText = (): string => {
    if (!state) return "";

    if (state.step === "profile") return t("clan.stepProfile");
    if (state.step === "battles") return t("clan.stepBattles");
    if (state.step === "publish") return t("clan.stepPublish");
    if (state.message === "logs") return t("clan.logsEmpty");
    if (state.message) return state.message;

    switch (state.detail) {
      case "need-code":
        return t("clan.needCode");
      case "need-profile":
        return t("clan.needProfile");
      case "bad-profile":
        return t("clan.badProfile");
      case "profile-failed":
        return t("clan.profileFailed");
      case "offline":
        return t("clan.offline");
      case "online":
        return t("clan.online");
      default:
        return "";
    }
  };

  const sync = () => {
    void window.electronAPI.clanSync({ profile, code }).then(setState);
  };

  const openLog = (log: ClanLog) => {
    const type = log.types[0]?.key;
    const query = type ? `?type=${encodeURIComponent(type)}` : "";

    navigate(`/logs/${encodeURIComponent(log.logId)}${query}`);
  };

  return (
    <div className={styles.root}>
      <div className={styles.heading}>
        <div className={styles.headingTitle}>
          <h1>{t("clan.title")}</h1>
          <BattlesView view={view} onView={onView} />
        </div>
        <p>{t("clan.subtitle")}</p>
      </div>

      <section className={styles.card}>
        <div className={styles.form}>
          <label className={styles.field}>
            <span>{t("clan.profile")}</span>
            <Input
              value={profile}
              placeholder={t("clan.profilePlaceholder")}
              onChange={(event) => {
                edited.current = true;
                setProfile(event.target.value);
              }}
            />
          </label>
          <label className={styles.field}>
            <span>{t("clan.code")}</span>
            <Input
              value={code}
              placeholder={t("clan.codePlaceholder")}
              onChange={(event) => {
                edited.current = true;
                setCode(event.target.value);
              }}
            />
          </label>
          <button
            type="button"
            className={styles.primary}
            disabled={state?.status === "syncing" || !profile.trim() || !code.trim()}
            onClick={sync}
          >
            {state?.status === "syncing" ? t("clan.syncing") : t("clan.save")}
          </button>
        </div>

        <div className={styles.statusRow}>
          <span className={classNames(styles.status, statusClass)}>{statusText()}</span>
          {state?.code && (
            <div className={styles.relays}>
              {state.relays.map((relay) => (
                <span key={relay.url} className={styles.relay}>
                  <span
                    className={classNames(styles.dot, {
                      [styles.on]: relay.connected,
                    })}
                  />
                  {relayName(relay.url)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className={styles.summary}>
          <div className={styles.stat}>
            <strong>{logs.length}</strong>
            <span>{t("clan.archive")}</span>
          </div>
          <div className={styles.stat}>
            <strong>{mine}</strong>
            <span>{t("clan.mine")}</span>
          </div>
          <div className={styles.stat}>
            <strong>{state?.mates.length ?? 0}</strong>
            <span>{t("clan.matesCount")}</span>
          </div>
        </div>

        {(state?.mates.length ?? 0) > 0 && (
          <div className={styles.mates}>
            {state?.mates.map((mate) => (
              <span key={mate.profileId} className={styles.mate}>
                {mate.nickname}
              </span>
            ))}
          </div>
        )}
      </section>

      {shown.length === 0 && <p className={styles.empty}>{t("clan.empty")}</p>}

      <div className={styles.list}>
        {shown.map((log) => {
          const own = sameNick(log.nickname, state?.nickname ?? "");

          return (
            <button
              key={log.logId}
              type="button"
              className={classNames(styles.link, { [styles.linkMine]: own })}
              onClick={() => openLog(log)}
            >
              <span className={styles.linkNick}>{log.nickname}</span>
              <span className={styles.linkTitle}>
                {log.title || log.logId}
              </span>
              <span className={styles.linkTypes}>
                {log.types.map((type) => (
                  <span key={type.key}>
                    {t(`logTypes.${type.key}`, { defaultValue: type.label || type.key })}
                  </span>
                ))}
              </span>
              <span className={styles.linkDate}>{when(log)}</span>
            </button>
          );
        })}
      </div>

      {visible < logs.length && (
        <button
          type="button"
          className={classNames(styles.secondary, styles.more)}
          onClick={() => setVisible((count) => count + PAGE)}
        >
          {t("clan.more")}
        </button>
      )}
    </div>
  );
};

export default Clan;
