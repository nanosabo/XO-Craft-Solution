import { FC, RefObject, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import classNames from "classnames";
import styles from "./styles/Tooltip.module.scss";

type Props = {
  title: string;
  subtitle: string;
  image?: string;
  visible: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  maxWidth?: number;
};

const MARGIN = 8;

const Tooltip: FC<Props> = ({
  title,
  subtitle,
  image,
  visible,
  anchorRef,
  maxWidth,
}) => {
  const tipRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const [shown, setShown] = useState(false);

  useLayoutEffect(() => {
    if (!visible) {
      setShown(false);
      setBox(null);
      return;
    }

    const place = () => {
      const anchor = anchorRef.current;
      const tip = tipRef.current;

      if (!anchor || !tip) return;

      const rect = anchor.getBoundingClientRect();
      const width = maxWidth ? Math.min(rect.width, maxWidth) : rect.width;
      const height = tip.offsetHeight;
      let top = rect.top - MARGIN - height;

      if (top < MARGIN) top = MARGIN;

      const lowest = window.innerHeight - MARGIN - height;

      if (top > lowest) top = Math.max(MARGIN, lowest);

      let left = rect.left;
      const rightLimit = window.innerWidth - MARGIN - width;

      if (left > rightLimit) left = Math.max(MARGIN, rightLimit);

      setBox({ left, top, width });
    };

    const imageNode = tipRef.current?.querySelector("img");
    let frame = 0;

    const reveal = () => {
      place();
      frame = requestAnimationFrame(() => setShown(true));
    };

    if (imageNode && !imageNode.complete) {
      imageNode.addEventListener("load", reveal);
    } else {
      reveal();
    }

    window.addEventListener("resize", place);

    return () => {
      cancelAnimationFrame(frame);
      imageNode?.removeEventListener("load", reveal);
      window.removeEventListener("resize", place);
    };
  }, [anchorRef, image, maxWidth, subtitle, title, visible]);

  if (!visible) return null;

  const anchorWidth = anchorRef.current?.getBoundingClientRect().width;

  return createPortal(
    <div
      ref={tipRef}
      className={classNames(styles.tooltip, {
        [styles.visible]: shown && box,
      })}
      style={{
        left: box?.left ?? anchorRef.current?.getBoundingClientRect().left ?? 0,
        top: box?.top ?? 0,
        width:
          box?.width ??
          (maxWidth && anchorWidth
            ? Math.min(anchorWidth, maxWidth)
            : anchorWidth),
      }}
    >
      <p>{title}</p>
      {subtitle && <span>{subtitle}</span>}
      {image && <img src={image} alt="" draggable="false" />}
    </div>,
    document.body,
  );
};

export default Tooltip;
