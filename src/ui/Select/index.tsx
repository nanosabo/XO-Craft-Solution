import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  memo,
} from "react";
import { createPortal } from "react-dom";
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
  disabled?: boolean;
  /** Keep the menu as wide as the closed control. */
  menuFit?: boolean;
}

const MAX_MENU_HEIGHT = 300;
const MIN_MENU_HEIGHT = 120;
const MENU_GAP = 6;
const VIEWPORT_MARGIN = 12;
const MENU_WIDTH_RATIO = 1.6;

interface MenuPosition {
  left: number;
  width: number;
  maxHeight: number;
  up: boolean;
  top?: number;
  bottom?: number;
}

const CustomSelect: React.FC<CustomSelectProps> = memo(
  ({
    options,
    defaultValue,
    onChange,
    order,
    menuPlacement = "down",
    disabled = false,
    menuFit = false,
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
    const [selected, setSelected] = useState<SelectOption>(() => {
      return options.find((opt) => opt.value === defaultValue) || options[0];
    });

    const containerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setSelected(
        options.find((opt) => opt.value === defaultValue) || options[0],
      );
    }, [defaultValue, options]);

    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        const target = e.target as Node;

        if (
          !containerRef.current?.contains(target) &&
          !menuRef.current?.contains(target)
        ) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleOutsideClick);
      return () =>
        document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    /**
     * The menu is rendered in a portal with fixed positioning. Otherwise the
     * blurred cards around the select create stacking contexts and paint over
     * the open menu.
     */
    const getMenuPosition = useCallback((): MenuPosition | null => {
      const container = containerRef.current;
      if (!container) return null;

      const rect = container.getBoundingClientRect();
      const width = Math.min(
        menuFit ? rect.width : rect.width * MENU_WIDTH_RATIO,
        window.innerWidth - VIEWPORT_MARGIN * 2,
      );
      const preferredLeft = menuFit
        ? rect.left
        : rect.left + rect.width / 2 - width / 2;
      const left = Math.min(
        Math.max(preferredLeft, VIEWPORT_MARGIN),
        window.innerWidth - width - VIEWPORT_MARGIN,
      );

      const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
      const spaceAbove = rect.top - VIEWPORT_MARGIN;

      const shouldOpenUp =
        menuPlacement === "up" ||
        (menuPlacement === "auto" &&
          spaceBelow < MAX_MENU_HEIGHT &&
          spaceAbove > spaceBelow);

      if (!shouldOpenUp && menuPlacement === "down") {
        return {
          left,
          width,
          maxHeight: MAX_MENU_HEIGHT,
          up: false,
          top: rect.bottom + MENU_GAP,
        };
      }

      const available = shouldOpenUp ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(
        MIN_MENU_HEIGHT,
        Math.min(MAX_MENU_HEIGHT, available - MENU_GAP),
      );

      return shouldOpenUp
        ? {
            left,
            width,
            maxHeight,
            up: true,
            bottom: window.innerHeight - rect.top + MENU_GAP,
          }
        : {
            left,
            width,
            maxHeight,
            up: false,
            top: rect.bottom + MENU_GAP,
          };
    }, [menuFit, menuPlacement]);

    useEffect(() => {
      if (!isOpen) return;

      const updatePosition = () => setMenuPosition(getMenuPosition());

      updatePosition();

      const handleScroll = (event: Event) => {
        if (menuRef.current?.contains(event.target as Node)) return;
        updatePosition();
      };

      window.addEventListener("resize", updatePosition);
      document.addEventListener("scroll", handleScroll, true);

      return () => {
        window.removeEventListener("resize", updatePosition);
        document.removeEventListener("scroll", handleScroll, true);
      };
    }, [isOpen, getMenuPosition]);

    const handleSelect = (option: SelectOption) => {
      setSelected(option);
      setIsOpen(false);
      onChange?.(option.value);
    };

    const handleToggle = () => {
      if (disabled) return;

      if (isOpen) {
        setIsOpen(false);
        return;
      }

      setMenuPosition(getMenuPosition());
      setIsOpen(true);
    };

    return (
      <div className={styles.container} ref={containerRef}>
        <div
          className={classNames(styles.control, {
            [styles.isOpen]: isOpen,
            [styles.disabled]: disabled,
          })}
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

        {isOpen &&
          menuPosition &&
          createPortal(
            <div
              ref={menuRef}
              className={classNames(styles.menu, styles.menuPortal, {
                [styles.menuUp]: menuPosition.up,
                [styles.menuFit]: menuFit,
              })}
              onMouseDown={(event) => {
                // The menu is portaled to document.body. A mousedown here must
                // not reach outside-click handlers on the parent dialog.
                event.stopPropagation();
              }}
              style={{
                left: menuPosition.left,
                width: menuPosition.width,
                maxHeight: menuPosition.maxHeight,
                top: menuPosition.up ? "auto" : menuPosition.top,
                bottom: menuPosition.up ? menuPosition.bottom : "auto",
              }}
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
            </div>,
            document.body,
          )}
      </div>
    );
  },
);

export default CustomSelect;
