import classNames from "classnames";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Tooltip from "@src/components/Tooltip";
import { selectMarketState } from "@src/store/slices/market.slice";
import { selectMarketModalState } from "@src/store/slices/marketModal.slice";
import { selectSettingsState } from "@src/store/slices/settings.slice";
import { useAppSelector } from "@src/store/store";
import { ArrowIcon, InfoIcon } from "@src/ui/icons";
import { buildPriceAdvice } from "./priceAdvice";
import { buildPriceScale } from "./priceScale";
import {
  buildMarketTrends,
  Trend,
  TrendDirection,
} from "./priceTrend";
import styles from "./styles/MarketPriceScale.module.scss";

const trendKey = (trend: Trend) =>
  `${trend.direction}${trend.strong ? "Strong" : ""}`;

const TrendArrow = ({ direction }: { direction: TrendDirection }) => {
  if (direction === "flat") {
    return <span className={classNames(styles.arrow, styles.arrowFlat)} />;
  }

  return (
    <span
      className={classNames(
        styles.arrow,
        direction === "down" ? styles.arrowDown : styles.arrowUp,
      )}
    >
      <ArrowIcon />
    </span>
  );
};

const MarketPriceScale = () => {
  const { chartData, item: itemId } = useAppSelector(selectMarketModalState);
  const { items } = useAppSelector(selectMarketState);
  const { priceScalePeriod } = useAppSelector(selectSettingsState);
  const { t, i18n } = useTranslation("marketPage", {
    keyPrefix: "chart.scale",
  });

  const [isRangeTooltipVisible, setIsRangeTooltipVisible] = useState(false);
  const [isAdviceTooltipVisible, setIsAdviceTooltipVisible] = useState(false);
  const bandRef = useRef<HTMLSpanElement>(null);
  const adviceRef = useRef<HTMLDivElement>(null);
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

  const trends = useMemo(
    () =>
      buildMarketTrends(
        chartData.s.map((price, index) => ({
          price,
          lots: chartData.so[index] ?? 0,
          time: chartData.ts[index] ?? 0,
        })),
      ),
    [chartData.s, chartData.so, chartData.ts],
  );

  const advice = useMemo(
    () => (scale ? buildPriceAdvice(scale.trend, trends) : null),
    [scale, trends],
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
          <span className={styles.currentLabel}>{t("current")}:</span>
          <span className={styles.currentValue}>
            {format(scale.current)}
            <img src="./coin.png" alt="" draggable={false} />
          </span>
        </div>

        <span
          className={classNames(styles.state, styles[scale.trend])}
          title={t("stateHint")}
        >
          {t(scale.trend)}
        </span>
      </div>

      {(trends.price || trends.lots) && (
        <div className={styles.trends}>
          <span className={styles.trendsLabel} title={t("trendHint")}>
            {t("trendLabel")}
          </span>

          {trends.price && (
            <span
              className={classNames(
                styles.trend,
                trends.price.direction === "down"
                  ? styles.priceDown
                  : trends.price.direction === "up"
                    ? styles.priceUp
                    : styles.priceFlat,
              )}
            >
              <TrendArrow direction={trends.price.direction} />
              {t(`trend.price.${trendKey(trends.price)}`)}
            </span>
          )}

          {trends.lots && (
            <span className={classNames(styles.trend, styles.lotsTone)}>
              <TrendArrow direction={trends.lots.direction} />
              {t(`trend.lots.${trends.lots.direction}`)}
            </span>
          )}
        </div>
      )}

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

      {advice && (
        <div
          ref={adviceRef}
          className={classNames(
            styles.advice,
            styles[`advice_${advice.tone}`],
          )}
          onMouseEnter={() => setIsAdviceTooltipVisible(true)}
          onMouseLeave={() => setIsAdviceTooltipVisible(false)}
        >
          <span className={styles.adviceIcon}>
            <InfoIcon />
          </span>
          <span className={styles.adviceText}>
            {t(advice.key)}
            {advice.lotsKey ? ` ${t(advice.lotsKey)}` : ""}
          </span>
        </div>
      )}

      <Tooltip
        title={t("rangeTooltip.title")}
        subtitle={t("rangeTooltip.text")}
        visible={isRangeTooltipVisible}
        anchorRef={bandRef}
        minWidth={400}
        maxWidth={460}
        align="center"
      />

      <Tooltip
        title={t("advice.tooltip.title")}
        subtitle={t("advice.tooltip.text")}
        visible={isAdviceTooltipVisible}
        anchorRef={adviceRef}
        minWidth={360}
        maxWidth={460}
      />
    </div>
  );
};

export default MarketPriceScale;
