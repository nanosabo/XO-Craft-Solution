import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { buildPriceSignal } from "@src/helpers/marketSignal";
import useMarketModal from "@src/hooks/useMarketModal";
import {
  selectMarketState,
  setSignalRule,
} from "@src/store/slices/market.slice";
import { selectSettingsState } from "@src/store/slices/settings.slice";
import { mergeSignalRules, type ItemSignalRules } from "@src/store/signals";
import { useAppDispatch, useAppSelector } from "@src/store/store";
import type { ItemSignalData } from "@src/types/marketSignal";

const useSignalRules = () => {
  const dispatch = useAppDispatch();
  const { item } = useMarketModal();
  const { followedItems, signalRules } = useAppSelector(selectMarketState);
  const { priceScalePeriod } = useAppSelector(selectSettingsState);

  const isFollowed = followedItems.includes(item.id);
  const rules = useMemo(
    () => mergeSignalRules(signalRules[item.id]),
    [signalRules, item.id],
  );

  const [draft, setDraft] = useState<string | null>(null);
  const [preview, setPreview] = useState<ItemSignalData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDraft(null);
    setPreview(null);
    setLoading(false);
  }, [item.id]);

  useEffect(() => {
    if (!isFollowed) {
      setPreview(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void window.electronAPI
      .fetchItemSignal(item.id)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isFollowed, item.id]);

  const priceResult = useMemo(
    () =>
      preview
        ? buildPriceSignal(preview.chart, item.rawPrices.s, priceScalePeriod)
        : null,
    [item.rawPrices.s, preview, priceScalePeriod],
  );

  const priceSignal = priceResult?.signal ?? null;
  const hasPriceScale = priceResult?.hasScale ?? false;

  const setRule = useCallback(
    (patch: Partial<ItemSignalRules>) => {
      dispatch(setSignalRule({ id: item.id, patch }));
    },
    [dispatch, item.id],
  );

  const onTogglePrice = (enabled: boolean) => setRule({ price: enabled });
  const onToggleCraft = (enabled: boolean) => setRule({ craft: enabled });

  const onMinProfitChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;

    setDraft(raw);

    if (raw.trim() === "") return;

    const next = Number(raw);

    if (!Number.isFinite(next)) return;

    setRule({ minProfit: next });
  };

  const onMinProfitBlur = () => setDraft(null);

  return {
    isFollowed,
    rules,
    draft,
    preview,
    loading,
    priceSignal,
    hasPriceScale,
    onTogglePrice,
    onToggleCraft,
    onMinProfitChange,
    onMinProfitBlur,
  };
};

export default useSignalRules;
