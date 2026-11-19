import { useId } from "react";
import styles from "@src/containers/Logs/styles/Logs.module.scss";

const STAR_PATH =
  "M31.547 12a.848.848 0 00-.677-.577l-9.427-1.376-4.224-8.532a.847.847 0 00-1.516 0l-4.218 8.534-9.427 1.355a.847.847 0 00-.467 1.467l6.823 6.664-1.612 9.375a.847.847 0 001.23.893l8.428-4.434 8.432 4.432a.847.847 0 001.229-.894l-1.615-9.373 6.822-6.665a.845.845 0 00.214-.869z";

const STAR_SIZE = 16;
const STAR_GAP = 3;
const STAR_STEP = STAR_SIZE + STAR_GAP;
const STAR_ROW = STAR_SIZE * 5 + STAR_GAP * 4;

const StarRating = ({ value }: { value: number }) => {
  const clipId = `stars-${useId().replace(/:/g, "")}`;
  const stars = Math.max(0, Math.min(5, value));
  const full = stars >= 5 ? 5 : Math.floor(stars);
  const fraction = stars >= 5 ? 0 : stars - full;
  const fill = stars >= 5 ? STAR_ROW : full * STAR_STEP + fraction * STAR_SIZE;

  return (
    <span className={styles.logStars} title={String(stars)}>
      <svg
        className={styles.logStarsSvg}
        viewBox={`0 0 ${STAR_ROW} ${STAR_SIZE}`}
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId}>
            {Array.from({ length: 5 }, (_, index) => (
              <path
                key={index}
                d={STAR_PATH}
                transform={`translate(${index * STAR_STEP} 0) scale(${STAR_SIZE / 32})`}
              />
            ))}
          </clipPath>
        </defs>
        <rect
          width={STAR_ROW}
          height={STAR_SIZE}
          fill="rgba(255, 255, 255, 0.18)"
          clipPath={`url(#${clipId})`}
        />
        <rect
          width={fill}
          height={STAR_SIZE}
          fill="#0077ff"
          clipPath={`url(#${clipId})`}
        />
      </svg>
    </span>
  );
};

export default StarRating;
