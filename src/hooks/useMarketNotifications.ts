import { useEffect, useRef } from "react";
import i18n from "@src/i18n";
import { logWarning } from "@src/helpers/errorLog";
import {
  getCachedItemNotificationIcon,
  getItemNotificationIcon,
} from "@src/helpers/notificationIcon";
import { playNotificationSignal } from "@src/helpers/notificationSound";
import {
  FollowMetric,
  FollowValues,
  followMetrics,
  getItemFollowValues,
  isLotsMetric,
  matchesFollowCondition,
  mergeFollowRules,
  roundFollowValue,
} from "@src/store/follow";
import {
  ensureFollowRules,
  IItemAnalytics,
  selectMarketState,
} from "@src/store/slices/market.slice";
import {
  MarketNotificationSettings,
  selectSettingsState,
} from "@src/store/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@src/store/store";

const notificationKeys: Record<
  FollowMetric,
  { title: string; body: string }
> = {
  sell: {
    title: "settingsPage:market.notificationSellTitle",
    body: "settingsPage:market.notificationSellBody",
  },
  buy: {
    title: "settingsPage:market.notificationBuyTitle",
    body: "settingsPage:market.notificationBuyBody",
  },
  sellLots: {
    title: "settingsPage:market.notificationSellLotsTitle",
    body: "settingsPage:market.notificationSellLotsBody",
  },
  buyLots: {
    title: "settingsPage:market.notificationBuyLotsTitle",
    body: "settingsPage:market.notificationBuyLotsBody",
  },
};

interface TriggeredNotification {
  item: IItemAnalytics;
  metric: FollowMetric;
  value: number;
  previousValue: number;
}

const useMarketNotifications = () => {
  const { items, followedItems, followRules } =
    useAppSelector(selectMarketState);
  const { notifications } = useAppSelector(selectSettingsState);
  const dispatch = useAppDispatch();

  const previousValues = useRef<Record<number, FollowValues>>({});
  const followedRef = useRef(followedItems);
  const rulesRef = useRef(followRules);
  const settingsRef = useRef(notifications);

  followedRef.current = followedItems;
  rulesRef.current = followRules;
  settingsRef.current = notifications;

  // Seed the baseline from the initial market response. Without this the first
  // update would not have anything to compare against.
  useEffect(() => {
    if (items.length === 0 || Object.keys(previousValues.current).length > 0) {
      return;
    }

    previousValues.current = Object.fromEntries(
      items.map((item) => [item.id, getItemFollowValues(item)]),
    );
  }, [items]);

  // Items followed before per-item rules existed, or before lot rules were
  // added, get sensible defaults seeded from their current market values.
  useEffect(() => {
    if (items.length === 0 || followedItems.length === 0) return;

    for (const id of followedItems) {
      const rules = followRules[id];

      if (
        rules &&
        followMetrics.every((metric) => rules[metric] !== undefined)
      ) {
        continue;
      }

      const item = items.find((entry) => entry.id === id);

      if (!item) continue;

      dispatch(ensureFollowRules({ id, values: getItemFollowValues(item) }));
    }
  }, [dispatch, followRules, followedItems, items]);

  // Prepare item icons ahead of time so a notification can be shown without
  // waiting for the image to be downloaded and converted.
  useEffect(() => {
    if (!notifications.priceDropEnabled || followedItems.length === 0) return;

    for (const id of followedItems) {
      void getItemNotificationIcon(id).catch((error) =>
        logWarning("notification-icon", error),
      );
    }
  }, [followedItems, notifications.priceDropEnabled]);

  useEffect(() => {
    const listener = (
      _: Electron.IpcRendererEvent,
      payload: { items: IItemAnalytics[] },
    ) => {
      const config: MarketNotificationSettings = settingsRef.current;
      const previous = previousValues.current;
      const followed = new Set(followedRef.current);
      const isBackground =
        document.visibilityState === "hidden" || !document.hasFocus();
      const canNotify = config.backgroundEnabled || !isBackground;

      const next: Record<number, FollowValues> = {};
      const triggered: TriggeredNotification[] = [];

      for (const item of payload.items) {
        const values = getItemFollowValues(item);
        const oldValues = previous[item.id];

        next[item.id] = values;

        if (
          !config.priceDropEnabled ||
          !canNotify ||
          !followed.has(item.id)
        ) {
          continue;
        }

        const rules = mergeFollowRules(rulesRef.current[item.id], values);

        for (const metric of followMetrics) {
          const rule = rules[metric];

          if (!rule?.enabled) continue;

          const value = values[metric];
          const oldValue = oldValues?.[metric];

          if (oldValue === undefined) continue;

          // A missing price means there are no offers, so price rules should
          // not fire. Lot counts of zero are valid and should be tracked.
          if (!isLotsMetric(metric) && (value <= 0 || oldValue <= 0)) continue;

          if (rule.condition === "any") {
            if (
              roundFollowValue(metric, value) ===
              roundFollowValue(metric, oldValue)
            ) {
              continue;
            }
          } else {
            if (!matchesFollowCondition(rule, value)) continue;
            if (matchesFollowCondition(rule, oldValue)) continue;
          }

          triggered.push({
            item,
            metric,
            value,
            previousValue: oldValue,
          });
        }
      }

      previousValues.current = next;

      if (triggered.length === 0) return;

      if (config.soundEnabled) {
        playNotificationSignal(config.signal, config.customSoundName);
      }

      for (const trigger of triggered) {
        const keys = notificationKeys[trigger.metric];
        const icon = getCachedItemNotificationIcon(trigger.item.id);
        const rounded = roundFollowValue(trigger.metric, trigger.value);
        const previous = roundFollowValue(
          trigger.metric,
          trigger.previousValue,
        );
        const value = isLotsMetric(trigger.metric)
          ? { amount: rounded, previous }
          : { price: rounded, previous };

        if (icon === null) {
          void getItemNotificationIcon(trigger.item.id).catch((error) =>
            logWarning("notification-icon", error),
          );
        }

        void window.electronAPI
          .showNotification({
            title: i18n.t(keys.title),
            body: i18n.t(keys.body, {
              name: trigger.item.name,
              ...value,
            }),
            icon: icon ?? undefined,
          })
          .catch((error) => logWarning("notification", error));
      }
    };

    window.ipcRenderer.on("update", listener);

    return () => {
      window.ipcRenderer.removeListener("update", listener);
    };
  }, []);
};

export default useMarketNotifications;
