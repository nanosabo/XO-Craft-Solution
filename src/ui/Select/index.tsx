import React, { useState, useRef, useEffect, memo } from "react";
import styles from "./styles/Select.module.scss";
import { ArrowIcon } from "../icons";
import classNames from "classnames";

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  defaultValue?: string;
  onChange?: (value: string) => void;
  order?: "asc" | "desc";
}

const CustomSelect: React.FC<CustomSelectProps> = memo(
  ({ options, defaultValue, onChange, order }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState<SelectOption>(() => {
      return options.find((opt) => opt.value === defaultValue) || options[0];
    });

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setSelected(
        options.find((opt) => opt.value === defaultValue) || options[0],
      );
    }, [defaultValue, options]);

    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
      };
      document.addEventListener("mousedown", handleOutsideClick);
      return () =>
        document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const handleSelect = (option: SelectOption) => {
      setSelected(option);
      setIsOpen(false);
      onChange?.(option.value);
    };

    return (
      <div className={styles.container} ref={containerRef}>
        <div
          className={classNames(styles.control, { [styles.isOpen]: isOpen })}
          onClick={() => setIsOpen(!isOpen)}
          title={selected.label}
        >
          {order && (
            <span
              className={classNames(styles.sort, {
                [styles.desc]: order === "desc",
              })}
            >
              {<ArrowIcon />}
            </span>
          )}
          <span className={styles.selected_option}>{selected.label}</span>
          <span className={classNames(styles.arrow, { [styles.up]: isOpen })} />
        </div>

        {isOpen && (
          <div className={styles.menu}>
            {options.map((option) => (
              <div
                key={option.value}
                className={classNames(styles.option, {
                  [styles.isSelected]: selected.value === option.value,
                })}
                onClick={() => handleSelect(option)}
                title={option.label}
              >
                {option.label}

                {selected.value === option.value && order && (
                  <span
                    className={classNames(styles.sort, {
                      [styles.desc]: order === "desc",
                    })}
                  >
                    {<ArrowIcon />}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);

export default CustomSelect;
