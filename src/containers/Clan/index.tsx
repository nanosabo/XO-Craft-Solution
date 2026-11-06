import classNames from "classnames";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import BattlesView, { type BattlesViewName } from "@src/components/BattlesView";
import type { ClanState } from "@src/types/clan";
import { CROSSOUT_MAPS, type CrossoutBattle } from "@src/types/crossout";
import Input from "@src/ui/Input";
import styles from "./styles/Clan.module.scss";

interface Props {
  view: BattlesViewName;
  onView: (view: BattlesViewName) => void;
}

interface Fight {
  key: string;
  map: string;
  date: number;
  type: string;
  duration: number;
  players: CrossoutBattle[];
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

const Clan = ({ view, onView }: Props) => {
  const { t, i18n } = useTranslation("logsPage");
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

  const fights = useMemo(() => {
    const groups = new Map<string, CrossoutBattle[]>();

    for (const battle of state?.battles ?? []) {
      const key =
        battle.battle_id > 0
          ? `${battle.type}:${battle.battle_id}`
          : `${battle.type}:${battle.date}:${battle.map}:${battle.nickname}`;
      const list = groups.get(key) ?? [];

      list.push(battle);
      groups.set(key, list);
    }

    return [...groups.values()]
      .map((players): Fight => {
        const first = [...players].sort((left, right) => right.date - left.date)[0];

        return {
          key: `${first.type}:${first.battle_id}:${first.date}:${first.map}:${first.nickname}`,
          map: first.map,
          date: first.date,
          type: first.type,
          duration: Math.max(...players.map((player) => player.timebattle)),
          players: [...players].sort((left, right) => right.damage - left.damage),
        };
      })
      .sort((left, right) => right.date - left.date);
  }, [state?.battles]);

  const shared = fights.filter((fight) => fight.players.length > 1).length;
  const shown = fights.slice(0, visible);

  const mapLabel = (value: string): string => {
    const map = CROSSOUT_MAPS.find((item) => item.value === value);

    if (!map) return value || "—";

    return isRu ? map.ru : map.en;
  };

  const typeLabel = (value: string): string => {
    if (!value) return "—";

    return t(`types.${value.toUpperCase()}`, { defaultValue: value });
  };

  const when = (date: number): string => {
    const ms = date > 10_000_000_000 ? date : date * 1000;

    if (!ms) return "—";

    return new Date(ms).toLocaleString(locale, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const duration = (seconds: number): string => {
    if (!seconds) return "";

    const minutes = Math.floor(seconds / 60);
    const rest = Math.floor(seconds % 60);

    return `${minutes}:${String(rest).padStart(2, "0")}`;
  };

  const result = (players: CrossoutBattle[]) => {
    const known = players.filter((player) => player.win >= 0);

    if (known.length === 0) return null;

    const wins = known.filter((player) => player.win > 0).length;

    if (wins === known.length) return { key: "win" as const, label: t("table.win") };
    if (wins === 0) return { key: "loss" as const, label: t("table.loss") };

    return { key: "mixed" as const, label: t("clan.mixed") };
  };

  const statusClass =
    state?.detail === "online"
      ? styles.online
      :     state?.detail === "profile-failed" ||
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
            <strong>{state?.battles.length ?? 0}</strong>
            <span>{t("clan.archive")}</span>
          </div>
          <div className={styles.stat}>
            <strong>{shared}</strong>
            <span>{t("clan.shared")}</span>
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
        {shown.map((fight) => {
          const outcome = result(fight.players);
          const length = duration(fight.duration);

          return (
            <div key={fight.key} className={styles.fight}>
              <div className={styles.fightHead}>
                <span className={styles.fightType}>{typeLabel(fight.type)}</span>
                <span className={styles.fightMeta}>{mapLabel(fight.map)}</span>
                <span className={styles.fightMeta}>{when(fight.date)}</span>
                {length && <span className={styles.fightMeta}>{length}</span>}
                {outcome && (
                  <span className={classNames(styles.fightMeta, styles[outcome.key])}>
                    {outcome.label}
                  </span>
                )}
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("clan.player")}</th>
                    <th>{t("table.damage")}</th>
                    <th>{t("table.kills")}</th>
                    <th>{t("table.ps")}</th>
                    <th>{t("table.weapon")}</th>
                  </tr>
                </thead>
                <tbody>
                  {fight.players.map((player) => (
                    <tr key={`${player.nickname}:${player.battle_id}:${player.date}`}>
                      <td className={styles.name}>{player.nickname}</td>
                      <td className={styles.number}>
                        {player.damage.toLocaleString(locale)}
                      </td>
                      <td className={styles.number}>
                        {player.death < 0
                          ? player.kill
                          : `${player.kill}/${player.death}`}
                      </td>
                      <td className={styles.number}>
                        {player.ur ? player.ur.toLocaleString(locale) : "—"}
                      </td>
                      <td className={styles.weapon}>{player.weapon || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {visible < fights.length && (
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
