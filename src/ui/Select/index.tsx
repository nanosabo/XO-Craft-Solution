import React, { useState, useRef, useEffect, memo } from "react";
import styles from "./styles/Select.module.scss";
import { ArrowIcon } from "../icons";
import classNames from "classnames";

export interface SelectOption {
  value: string;
  label: string;
}

type MenuPlacement = "down" | "up" | "auto";

interface CustomSelectProps {
  options: SelectOption[];
  defaultValue?: string;
  onChange?: (value: string) => void;
  order?: "asc" | "desc";
  menuPlacement?: MenuPlacement;
}

const MAX_MENU_HEIGHT = 300;
const MIN_MENU_HEIGHT = 120;
const MENU_GAP = 6;
const VIEWPORT_MARGIN = 12;

const CustomSelect: React.FC<CustomSelectProps> = memo(
  ({
    options,
    defaultValue,
    onChange,
    order,
    menuPlacement = "down",
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [openUp, setOpenUp] = useState(false);
    const [menuMaxHeight, setMenuMaxHeight] = useState<number>();
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

    const handleToggle = () => {
      if (isOpen) {
        setIsOpen(false);
        return;
      }

      if (menuPlacement !== "down" && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
        const spaceAbove = rect.top - VIEWPORT_MARGIN;
        const shouldOpenUp =
          menuPlacement === "up" ||
          (spaceBelow < MAX_MENU_HEIGHT && spaceAbove > spaceBelow);

        setOpenUp(shouldOpenUp);
        setMenuMaxHeight(
          Math.max(
            MIN_MENU_HEIGHT,
            Math.min(
              MAX_MENU_HEIGHT,
              (shouldOpenUp ? spaceAbove : spaceBelow) - MENU_GAP,
            ),
          ),
        );
      } else {
        setOpenUp(false);
        setMenuMaxHeight(undefined);
      }

      setIsOpen(true);
    };

    return (
      <div className={styles.container} ref={containerRef}>
        <div
          className={classNames(styles.control, { [styles.isOpen]: isOpen })}
          onClick={handleToggle}
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
          <div
            className={classNames(styles.menu, {
              [styles.menuUp]: openUp,
            })}
            style={
              menuMaxHeight !== undefined
                ? { maxHeight: menuMaxHeight }
                : undefined
            }
          >
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
