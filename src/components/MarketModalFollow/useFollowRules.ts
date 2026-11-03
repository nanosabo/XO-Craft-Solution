import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useMarketModal from "@src/hooks/useMarketModal";
import {
  FollowCondition,
  FollowMetric,
  FollowRules,
  isLotsMetric,
  mergeFollowRules,
} from "@src/store/follow";
import {
  ensureFollowRules,
  selectMarketState,
  setFollowedItem,
  setFollowRule,
} from "@src/store/slices/market.slice";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import { followConditions, FollowGroup } from "./constants";

const useFollowRules = () => {
  const { t, i18n } = useTranslation("marketPage");
  const dispatch = useAppDispatch();
  const { item } = useMarketModal();
  const { followedItems, followRules } = useAppSelector(selectMarketState);

  const isFollowed = followedItems.includes(item.id);

  const values = useMemo(
    () => ({
      sell: item.rawPrices.s,
      buy: item.rawPrices.b,
      sellLots: item.offers.s,
      buyLots: item.offers.b,
    }),
    [item.rawPrices.s, item.rawPrices.b, item.offers.s, item.offers.b],
  );

  const rules: FollowRules = useMemo(
    () => mergeFollowRules(followRules[item.id], values),
    [followRules, item.id, values],
  );

  const [activeGroup, setActiveGroup] = useState<FollowGroup>("price");
  const [drafts, setDrafts] = useState<Partial<Record<FollowMetric, string>>>(
    {},
  );

  useEffect(() => {
    setDrafts({});
    setActiveGroup("price");
  }, [item.id]);

  useEffect(() => {
    if (!isFollowed) return;

    dispatch(ensureFollowRules({ id: item.id, values }));
  }, [dispatch, isFollowed, item.id, values]);

  const formatValue = useCallback(
    (metric: FollowMetric, value: number) =>
      value.toLocaleString(i18n.language, {
        maximumFractionDigits: isLotsMetric(metric) ? 0 : 2,
      }),
    [i18n.language],
  );

  const conditionOptions = useMemo(
    () =>
      followConditions.map((condition) => ({
        value: condition,
        label: t(`modal.follow.conditions.${condition}`),
      })),
    [t],
  );

  const metricLabel = useCallback(
    (metric: FollowMetric) => t(`modal.follow.metrics.${metric}`),
    [t],
  );

  const onToggleFollow = () => {
    dispatch(setFollowedItem({ id: item.id, values }));
  };

  const onToggleRule = (metric: FollowMetric, enabled: boolean) => {
    dispatch(setFollowRule({ id: item.id, metric, patch: { enabled } }));
  };

  const onConditionChange = (metric: FollowMetric, condition: string) => {
    dispatch(
      setFollowRule({
        id: item.id,
        metric,
        patch: { condition: condition as FollowCondition },
      }),
    );
  };

  const onValueChange = (
    metric: FollowMetric,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const raw = event.target.value;

    setDrafts((current) => ({ ...current, [metric]: raw }));

    if (raw.trim() === "") return;

    const next = Number(raw);

    if (!Number.isFinite(next)) return;

    dispatch(setFollowRule({ id: item.id, metric, patch: { value: next } }));
  };

  const onValueBlur = (metric: FollowMetric) => {
    setDrafts((current) => {
      const next = { ...current };
      delete next[metric];
      return next;
    });
  };

  return {
    item,
    isFollowed,
    values,
    rules,
    activeGroup,
    setActiveGroup,
    drafts,
    formatValue,
    conditionOptions,
    metricLabel,
    onToggleFollow,
    onToggleRule,
    onConditionChange,
    onValueChange,
    onValueBlur,
  };
};

export default useFollowRules;
