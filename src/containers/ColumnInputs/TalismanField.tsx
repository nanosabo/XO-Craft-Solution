import InputIcons from "@src/ui/icons/InputIcons";
import Tooltip from "@src/components/Tooltip";
import {
  emptyTalismans,
  talismanPercent,
  TalismanSlot,
  TalismanSlots,
} from "@src/helpers/durabilityBonus";
import { VehicleFormData } from "@src/helpers/validation";
import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "./styles/ColumtInputs.module.scss";

const OPTIONS: TalismanSlot[] = [0, 7, 9];

const optionKey = (slot: TalismanSlot) => {
  if (slot === 7) return "stock";
  if (slot === 9) return "upgraded";
  return "none";
};

const TalismanField = () => {
  const { t } = useTranslation("mainPage", { keyPrefix: "inputs.talisman" });
  const { watch, setValue } = useFormContext<VehicleFormData>();
  const watched = watch("talismans");
  const slots: TalismanSlots = watched
    ? [watched[0] === 7 || watched[0] === 9 ? watched[0] : 0, watched[1] === 7 || watched[1] === 9 ? watched[1] : 0]
    : emptyTalismans();
  const percent = talismanPercent(slots);

  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const tooltipVisibilityTimerRef = useRef<null | NodeJS.Timeout>(null);

  useEffect(
    () => () => {
      if (tooltipVisibilityTimerRef.current) {
        clearTimeout(tooltipVisibilityTimerRef.current);
      }
    },
    [],
  );

  const showTooltip = () => {
    tooltipVisibilityTimerRef.current = setTimeout(
      () => setIsTooltipVisible(true),
      500,
    );
  };

  const hideTooltip = () => {
    if (tooltipVisibilityTimerRef.current) {
      clearTimeout(tooltipVisibilityTimerRef.current);
    }
    setIsTooltipVisible(false);
  };

  const selectSlot = (index: 0 | 1, value: TalismanSlot) => {
    const next: TalismanSlots = [...slots];
    next[index] = value;
    setValue("talismans", next, { shouldDirty: true });
  };

  return (
    <div className={styles.talisman} ref={sectionRef}>
      <Tooltip
        title={t("tooltip.title")}
        subtitle={t("tooltip.subtitle")}
        visible={isTooltipVisible}
        anchorRef={sectionRef}
        maxWidth={280}
      />
      <div className={styles.talismanHead}>
        <InputIcons.TalismanIcon />
        <p>{t("title")}</p>
        <span onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
          <InputIcons.QuestionIcon />
        </span>
        <b className={classNames({ [styles.talismanBonusOn]: percent > 0 })}>
          +{percent}%
        </b>
      </div>
      <div className={styles.talismanSlots}>
        {slots.map((selected, index) => (
          <div className={styles.talismanSlot} key={index}>
            <span>{t("slot", { n: index + 1 })}</span>
            <div className={styles.talismanOptions} role="radiogroup">
              {OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected === option}
                  className={classNames(styles.talismanOption, {
                    [styles.talismanOptionOn]:
                      selected === option && option !== 9,
                    [styles.talismanOptionUpgraded]:
                      selected === option && option === 9,
                  })}
                  onClick={() => selectSlot(index as 0 | 1, option)}
                >
                  {t(optionKey(option))}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TalismanField;
