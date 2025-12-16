import Input from "@src/ui/Input";
import InputIcons from "@src/ui/icons/InputIcons";
import { FC, InputHTMLAttributes, useEffect, useRef, useState } from "react";
import styles from "./styles/InputSection.module.scss";
import Tooltip from "../Tooltip";

export interface InputSectionProps
  extends InputHTMLAttributes<HTMLInputElement> {
  icon: keyof Omit<typeof InputIcons, "QuestionIcon">;
  title: string;
  tooltipTitle: string;
  toolTipSubtitle: string;
  tooltipImage?: string;
}

const InputSection: FC<InputSectionProps> = ({
  icon,
  title,
  type,
  tooltipTitle,
  toolTipSubtitle,
  tooltipImage,
  ...props
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const Icon = InputIcons[icon];

  const tooltipVisibilityTimerRef = useRef<null | NodeJS.Timeout>(null);

  useEffect(
    () => () => {
      tooltipVisibilityTimerRef.current &&
        clearTimeout(tooltipVisibilityTimerRef.current);
    },
    []
  );

  const handleQuestionHover = () => {
    tooltipVisibilityTimerRef.current = setTimeout(
      () => setIsTooltipVisible(true),
      500
    );
  };

  const handleQuestionBlur = () => {
    tooltipVisibilityTimerRef.current &&
      clearTimeout(tooltipVisibilityTimerRef.current);

    setIsTooltipVisible(false);
  };

  return (
    <div className={styles.input_section}>
      <Tooltip
        title={tooltipTitle}
        subtitle={toolTipSubtitle}
        image={tooltipImage}
        visible={isTooltipVisible}
      />
      <div className={styles.header}>
        <Icon />
        <p>{title}</p>
        <span
          onMouseEnter={handleQuestionHover}
          onMouseLeave={handleQuestionBlur}
        >
          <InputIcons.QuestionIcon />
        </span>
      </div>
      <Input {...props} type={type} />
    </div>
  );
};

export default InputSection;
