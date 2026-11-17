import classNames from "classnames";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Tooltip from "@src/components/Tooltip";
import { selectMarketState } from "@src/store/slices/market.slice";
import { selectMarketModalState } from "@src/store/slices/marketModal.slice";
import { selectSettingsState } from "@src/store/slices/settings.slice";
import { useAppSelector } from "@src/store/store";
import { buildPriceScale } from "./priceScale";
import styles from "./styles/MarketPriceScale.module.scss";

const MarketPriceScale = () => {
  const { chartData, item: itemId } = useAppSelector(selectMarketModalState);
  const { items } = useAppSelector(selectMarketState);
  const { priceScalePeriod } = useAppSelector(selectSettingsState);
  const { t, i18n } = useTranslation("marketPage", {
    keyPrefix: "chart.scale",
  });

  const [isRangeTooltipVisible, setIsRangeTooltipVisible] = useState(false);
  const bandRef = useRef<HTMLSpanElement>(null);
  const bandTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (bandTimer.current) window.clearTimeout(bandTimer.current);
    },
    [],
  );

  const currentPrice = items.find((item) => item.id === itemId)?.rawPrices.s;

  const scale = useMemo(
    () =>
      buildPriceScale(
        chartData.s.map((price, index) => ({
          price,
          time: chartData.ts[index] ?? 0,
        })),
        currentPrice ?? 0,
        priceScalePeriod,
      ),
    [chartData.s, chartData.ts, currentPrice, priceScalePeriod],
  );

  const format = (value: number) =>
    value.toLocaleString(i18n.language, { maximumFractionDigits: 2 });

  const showRangeTooltip = () => {
    bandTimer.current = window.setTimeout(
      () => setIsRangeTooltipVisible(true),
      250,
    );
  };

  const hideRangeTooltip = () => {
    if (bandTimer.current) {
      window.clearTimeout(bandTimer.current);
      bandTimer.current = null;
    }

    setIsRangeTooltipVisible(false);
  };

  if (chartData.t.length === 0) return null;

  if (!scale) {
    return (
      <div className={styles.root}>
        <div className={styles.empty}>
          <span className={styles.emptyTitle}>{t("noData")}</span>
          <span className={styles.emptyHint}>{t("noDataHint")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.current}>
          <span className={styles.currentLabel}>{t("current")}</span>
          <span className={styles.currentValue}>
            {format(scale.current)}
            <img src="./coin.png" alt="" draggable={false} />
          </span>
        </div>

        <span className={classNames(styles.state, styles[scale.trend])}>
          {t(scale.trend)}
        </span>
      </div>

      <div className={styles.scale}>
        <div className={styles.track}>
          <span
            className={styles.markerLabel}
            style={{
              left: `clamp(18px, ${scale.position}%, calc(100% - 18px))`,
            }}
          >
            {t("marker")}
          </span>

          <div className={styles.bar}>
            <span
              ref={bandRef}
              className={styles.band}
              style={{
                left: `${scale.bandLeft}%`,
                width: `${scale.bandWidth}%`,
              }}
              onMouseEnter={showRangeTooltip}
              onMouseLeave={hideRangeTooltip}
            />
            <span
              className={styles.marker}
              style={{ left: `${scale.position}%` }}
            />
          </div>
        </div>

        <div className={styles.ends}>
          <span>{t("cheapLabel")}</span>
          <span className={styles.hint}>
            {t("range", {
              from: format(scale.normalLow),
              to: format(scale.normalHigh),
            })}
          </span>
          <span>{t("expensiveLabel")}</span>
        </div>
      </div>

      <Tooltip
        title={t("rangeTooltip.title")}
        subtitle={t("rangeTooltip.text")}
        visible={isRangeTooltipVisible}
        anchorRef={bandRef}
        minWidth={400}
        maxWidth={460}
        align="center"
      />
    </div>
  );
};

export default MarketPriceScale;
