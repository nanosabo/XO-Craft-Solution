import { useEffect, useRef } from "react";
import i18n from "@src/i18n";
import { logWarning } from "@src/helpers/errorLog";
import { buildPriceSignal } from "@src/helpers/marketSignal";
import {
  getCachedItemNotificationIcon,
  getItemNotificationIcon,
} from "@src/helpers/notificationIcon";
import { playNotificationSignal } from "@src/helpers/notificationSound";
import {
  IItemAnalytics,
  selectMarketState,
} from "@src/store/slices/market.slice";
import { selectSettingsState } from "@src/store/slices/settings.slice";
import { pushNotificationHistory } from "@src/store/slices/notificationHistory.slice";
import {
  mergeSignalRules,
  type PriceSignalKind,
} from "@src/store/signals";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import type { CraftSignal, ItemSignalData } from "@src/types/marketSignal";

const STORAGE_KEY = "marketSignals";

/** The main market update event drives the checks, this is only a fallback. */
const CHECK_INTERVAL = 30 * 60 * 1000;
const FIRST_CHECK_DELAY = 60 * 1000;

/** One item can send the same kind of advice again only after this pause. */
const PRICE_COOLDOWN = 6 * 60 * 60 * 1000;
const CRAFT_COOLDOWN = 12 * 60 * 60 * 1000;

/**
 * Chart history is fetched per item, so a check stays small and the cursor
 * rotates through the whole watchlist over several checks.
 */
const MAX_ITEMS_PER_CHECK = 6;
const MAX_NOTIFICATIONS_PER_CHECK = 4;

/** Profit has to fall clearly below the threshold before it can trigger again. */
const CRAFT_HYSTERESIS = 0.8;

interface SignalMemoryEntry {
  /** Last advice signature, or "none" when there was nothing to say. */
  priceKey?: string;
  priceAt?: number;
  signal?: PriceSignalKind;
  profit?: number;
  craftAbove?: boolean;
  craftAt?: number;
  checkedAt?: number;
}

type SignalMemory = Record<string, SignalMemoryEntry>;

type PendingSignal =
  | {
      kind: "price";
      item: IItemAnalytics;
      signalKind: PriceSignalKind;
      adviceKey: string;
      lotsKey: string | null;
    }
  | {
      kind: "craft";
      item: IItemAnalytics;
      craft: CraftSignal;
    };

const readMemory = (): SignalMemory => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SignalMemory) : {};
  } catch {
    return {};
  }
};

const writeMemory = (memory: SignalMemory) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    /* Storage can be unavailable, signals still work for this session. */
  }
};

let historySerial = 0;

const useMarketSignals = () => {
  const { items, followedItems, signalRules } =
    useAppSelector(selectMarketState);
  const { notifications, priceScalePeriod } =
    useAppSelector(selectSettingsState);
  const dispatch = useAppDispatch();

  const latestItems = useRef(items);
  const followedRef = useRef(followedItems);
  const rulesRef = useRef(signalRules);
  const settingsRef = useRef(notifications);
  const periodRef = useRef(priceScalePeriod);
  const cursorRef = useRef(0);
  const runningRef = useRef(false);
  const lastCheckRef = useRef(0);

  latestItems.current = items;
  followedRef.current = followedItems;
  rulesRef.current = signalRules;
  settingsRef.current = notifications;
  periodRef.current = priceScalePeriod;

  // Prepare icons ahead of time, same as the rule-based notifications do.
  useEffect(() => {
    if (
      (!notifications.signalPriceEnabled &&
        !notifications.signalCraftEnabled) ||
      followedItems.length === 0
    ) {
      return;
    }

    for (const id of followedItems) {
      void getItemNotificationIcon(id).catch((error) =>
        logWarning("notification-icon", error),
      );
    }
  }, [
    followedItems,
    notifications.signalCraftEnabled,
    notifications.signalPriceEnabled,
  ]);

  useEffect(() => {
    const runCheck = async () => {
      if (runningRef.current) return;

      const config = settingsRef.current;
      const priceEnabled = config.signalPriceEnabled;
      const craftEnabled = config.signalCraftEnabled;

      if (!priceEnabled && !craftEnabled) return;
      if (latestItems.current.length === 0) return;

      const isBackground =
        document.visibilityState === "hidden" || !document.hasFocus();

      if (!config.backgroundEnabled && isBackground) return;

      const followed = followedRef.current;
      const rules = rulesRef.current;
      const memory = readMemory();

      // Forget items that are no longer followed so re-following starts clean.
      for (const key of Object.keys(memory)) {
        if (!followed.includes(Number(key))) delete memory[key];
      }

      const candidates = followed.filter((id) => {
        const rule = mergeSignalRules(rules[id]);
        return (priceEnabled && rule.price) || (craftEnabled && rule.craft);
      });

      if (candidates.length === 0) return;

      runningRef.current = true;
      lastCheckRef.current = Date.now();

      try {
        const fresh = candidates.filter((id) => memory[id] === undefined);
        const known = candidates.filter((id) => memory[id] !== undefined);
        const start = known.length > 0 ? cursorRef.current % known.length : 0;
        const rotated =
          known.length > 0
            ? [...known.slice(start), ...known.slice(0, start)]
            : [];
        const batch = [...fresh, ...rotated].slice(0, MAX_ITEMS_PER_CHECK);
        const knownChecked = Math.max(
          0,
          Math.min(rotated.length, MAX_ITEMS_PER_CHECK - fresh.length),
        );

        if (known.length > 0) {
          cursorRef.current = (start + knownChecked) % known.length;
        }

        const now = Date.now();
        const pending: PendingSignal[] = [];

        for (const id of batch) {
          const item = latestItems.current.find((entry) => entry.id === id);
          if (!item) continue;

          const rule = mergeSignalRules(rules[id]);
          let data: ItemSignalData;

          try {
            data = await window.electronAPI.fetchItemSignal(id);
          } catch (error) {
            logWarning("market-signal", error);
            continue;
          }

          const entry = memory[id] ?? {};

          if (priceEnabled && rule.price && item.rawPrices.s > 0) {
            const result = buildPriceSignal(
              data.chart,
              item.rawPrices.s,
              periodRef.current,
            );
            const signal = result.signal;

            if (result.hasScale) {
              if (signal) {
                if (entry.priceKey !== signal.key) {
                  const firstTime = entry.priceKey === undefined;
                  const cooldownPassed =
                    now - (entry.priceAt ?? 0) >= PRICE_COOLDOWN;

                  if (!firstTime && cooldownPassed) {
                    pending.push({
                      kind: "price",
                      item,
                      signalKind: signal.kind,
                      adviceKey: signal.advice.key,
                      lotsKey: signal.advice.lotsKey,
                    });
                    entry.priceAt = now;
                  }

                  entry.priceKey = signal.key;
                  entry.signal = signal.kind;
                }
              } else if (entry.priceKey !== "none") {
                entry.priceKey = "none";
                entry.signal = undefined;
              }
            }
          }

          if (craftEnabled && rule.craft) {
            if (data.craft.hasRecipe) {
              const profit = data.craft.profit;
              const above = profit >= rule.minProfit;
              const belowHysteresis =
                profit < rule.minProfit * CRAFT_HYSTERESIS;
              const wasAbove = entry.craftAbove === true;

              if (above && !wasAbove) {
                const firstTime = entry.craftAbove === undefined;
                const cooldownPassed =
                  now - (entry.craftAt ?? 0) >= CRAFT_COOLDOWN;

                if (!firstTime && cooldownPassed) {
                  pending.push({ kind: "craft", item, craft: data.craft });
                  entry.craftAt = now;
                }

                entry.craftAbove = true;
              } else if (belowHysteresis) {
                entry.craftAbove = false;
              }
            } else {
              entry.craftAbove = false;
            }

            entry.profit = data.craft.profit;
          }

          entry.checkedAt = now;
          memory[id] = entry;
        }

        writeMemory(memory);

        const limited = pending.slice(0, MAX_NOTIFICATIONS_PER_CHECK);
        if (limited.length === 0) return;

        if (config.soundEnabled) {
          playNotificationSignal(config.signal, config.customSoundName);
        }

        for (const entry of limited) {
          if (!followedRef.current.includes(entry.item.id)) continue;

          const icon = getCachedItemNotificationIcon(entry.item.id);

          if (icon === null) {
            void getItemNotificationIcon(entry.item.id).catch((error) =>
              logWarning("notification-icon", error),
            );
          }

          if (entry.kind === "price") {
            const advice = i18n.t(
              `marketPage:chart.scale.${entry.adviceKey}`,
            );
            const lots = entry.lotsKey
              ? ` ${i18n.t(`marketPage:chart.scale.${entry.lotsKey}`)}`
              : "";
            const title = i18n.t(
              `marketPage:history.price.${entry.signalKind}.title`,
            );

            void window.electronAPI
              .showNotification({
                title,
                body: `${entry.item.name}. ${advice}${lots}`,
                icon: icon ?? undefined,
              })
              .catch((error) => logWarning("notification", error));

            dispatch(
              pushNotificationHistory({
                id: `${entry.item.id}-price-${now}-${historySerial++}`,
                itemId: entry.item.id,
                name: entry.item.name,
                kind: "price",
                signal: entry.signalKind,
                adviceKey: entry.adviceKey,
                lotsKey: entry.lotsKey,
                at: now,
              }),
            );
          } else {
            const profit = Math.round(entry.craft.profit);
            const title = i18n.t("marketPage:history.craft.title");
            const body = `${i18n.t("marketPage:history.craft.body", {
              name: entry.item.name,
              profit: profit.toLocaleString(i18n.language),
            })} ${i18n.t(
              entry.craft.isOwn
                ? "marketPage:history.craft.own"
                : "marketPage:history.craft.official",
            )}`;

            void window.electronAPI
              .showNotification({
                title,
                body,
                icon: icon ?? undefined,
              })
              .catch((error) => logWarning("notification", error));

            dispatch(
              pushNotificationHistory({
                id: `${entry.item.id}-craft-${now}-${historySerial++}`,
                itemId: entry.item.id,
                name: entry.item.name,
                kind: "craft",
                profit: entry.craft.profit,
                isOwn: entry.craft.isOwn,
                at: now,
              }),
            );
          }
        }
      } catch (error) {
        logWarning("market-signals", error);
      } finally {
        runningRef.current = false;
      }
    };

    const maybeCheck = () => {
      if (Date.now() - lastCheckRef.current < CHECK_INTERVAL) return;
      void runCheck();
    };

    // Market updates arrive from the main process even when the window is
    // hidden, so they are a reliable clock for background checks.
    const listener = (
      _: Electron.IpcRendererEvent,
      payload: { items: IItemAnalytics[] },
    ) => {
      latestItems.current = payload.items;
      maybeCheck();
    };

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      maybeCheck();
    };

    const first = window.setTimeout(() => {
      void runCheck();
    }, FIRST_CHECK_DELAY);
    const fallback = window.setInterval(maybeCheck, CHECK_INTERVAL);

    window.ipcRenderer.on("update", listener);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearTimeout(first);
      window.clearInterval(fallback);
      window.ipcRenderer.removeListener("update", listener);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [dispatch]);
};

export default useMarketSignals;
