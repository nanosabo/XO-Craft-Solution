import Input from "@src/ui/Input";
import InputIcons from "@src/ui/icons/InputIcons";
import { FC, InputHTMLAttributes } from "react";
import styles from "./styles/InputSection.module.scss";

export interface InputSectionProps
  extends InputHTMLAttributes<HTMLInputElement> {
  icon: keyof Omit<typeof InputIcons, "QuestionIcon">;
  title: string;
}

const InputSection: FC<InputSectionProps> = ({
  icon,
  title,
  type,
  ...props
}) => {
  const Icon = InputIcons[icon];

  return (
    <div className={styles.input_section}>
      <div className={styles.header}>
        <Icon />
        <p>{title}</p>
        <InputIcons.QuestionIcon />
      </div>
      <Input {...props} type={type} />
    </div>
  );
};

export default InputSection;
