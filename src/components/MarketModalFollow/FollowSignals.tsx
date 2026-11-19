import classNames from "classnames";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { InfoIcon } from "@src/ui/icons";
import styles from "./styles/MarketModalFollow.module.scss";
import useSignalRules from "./useSignalRules";

const FollowSignals: FC = () => {
  const { t, i18n } = useTranslation("marketPage");
  const {
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
  } = useSignalRules();

  const disabled = !isFollowed;
  const craft = preview?.craft ?? null;
  const formatCoins = (value: number) =>
    Math.round(value).toLocaleString(i18n.language);

  const priceText = !isFollowed
    ? t("modal.follow.disabledHint")
    : loading
      ? t("modal.follow.signals.loading")
      : !hasPriceScale
        ? t("modal.follow.signals.price.noData")
        : priceSignal
          ? `${t(`chart.scale.${priceSignal.advice.key}`)}${
              priceSignal.advice.lotsKey
                ? ` ${t(`chart.scale.${priceSignal.advice.lotsKey}`)}`
                : ""
            }`
          : t("modal.follow.signals.price.quiet");

  const craftText = !isFollowed
    ? t("modal.follow.disabledHint")
    : loading
      ? t("modal.follow.signals.loading")
      : !craft || !craft.hasRecipe
        ? t("modal.follow.signals.craft.noRecipe")
        : `${t(
            craft.profit >= rules.minProfit
              ? "modal.follow.signals.craft.good"
              : "modal.follow.signals.craft.low",
            { profit: formatCoins(craft.profit) },
          )} ${t(
            craft.isOwn
              ? "modal.follow.signals.craft.own"
              : "modal.follow.signals.craft.official",
          )}`;

  const craftReached =
    !!craft && craft.hasRecipe && craft.profit >= rules.minProfit;

  return (
    <div className={styles.signals}>
      <div
        className={classNames(styles.signalCard, {
          [styles.ruleDisabled]: disabled,
          [styles.ruleOff]: !rules.price,
        })}
      >
        <div className={styles.ruleHeader}>
          <div className={styles.signalTitle}>
            <h5>{t("modal.follow.signals.price.title")}</h5>
            <span>{t("modal.follow.signals.price.subtitle")}</span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={rules.price}
            aria-label={t("modal.follow.signals.price.title")}
            title={t("modal.follow.signals.price.title")}
            disabled={disabled}
            className={classNames(styles.switch, {
              [styles.switchOn]: rules.price,
            })}
            onClick={() => onTogglePrice(!rules.price)}
          >
            <span className={styles.switchThumb} />
          </button>
        </div>

        <div
          className={classNames(
            styles.signalPreview,
            styles[`signalPreview_${priceSignal?.advice.tone ?? "neutral"}`],
            { [styles.signalPreviewMuted]: !rules.price },
          )}
        >
          <span className={styles.signalPreviewIcon}>
            <InfoIcon />
          </span>
          <span>{priceText}</span>
        </div>
      </div>

      <div
        className={classNames(styles.signalCard, {
          [styles.ruleDisabled]: disabled,
          [styles.ruleOff]: !rules.craft,
        })}
      >
        <div className={styles.ruleHeader}>
          <div className={styles.signalTitle}>
            <h5>{t("modal.follow.signals.craft.title")}</h5>
            <span>
              {craft && craft.hasRecipe
                ? t(
                    craft.isOwn
                      ? "modal.follow.signals.craft.own"
                      : "modal.follow.signals.craft.official",
                  )
                : t("modal.follow.signals.craft.subtitle")}
            </span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={rules.craft}
            aria-label={t("modal.follow.signals.craft.title")}
            title={t("modal.follow.signals.craft.title")}
            disabled={disabled}
            className={classNames(styles.switch, {
              [styles.switchOn]: rules.craft,
            })}
            onClick={() => onToggleCraft(!rules.craft)}
          >
            <span className={styles.switchThumb} />
          </button>
        </div>

        <div className={styles.ruleControls}>
          <span className={styles.signalFieldLabel}>
            {t("modal.follow.signals.craft.minProfit")}
          </span>

          <label
            className={classNames(styles.field, {
              [styles.fieldDisabled]: disabled || !rules.craft,
            })}
          >
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={10}
              value={draft ?? String(rules.minProfit)}
              disabled={disabled || !rules.craft}
              onChange={onMinProfitChange}
              onBlur={onMinProfitBlur}
              aria-label={t("modal.follow.signals.craft.minProfit")}
            />
            <span>{t("modal.follow.units.currency")}</span>
          </label>

          <p
            className={classNames(styles.ruleHint, styles.signalCraftHint, {
              [styles.signalCraftReached]: craftReached,
              [styles.signalPreviewMuted]: !rules.craft,
            })}
          >
            {craftText}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FollowSignals;
