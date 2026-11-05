const UNITS = ["B", "KB", "MB", "GB"];

/**
 * Formats a byte count for the updater UI. Latin units are used in both
 * locales so the value stays compact and unambiguous.
 */
const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const index = Math.max(
    0,
    Math.min(
      UNITS.length - 1,
      Math.floor(Math.log(bytes) / Math.log(1024)),
    ),
  );
  const value = bytes / 1024 ** index;

  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${
    UNITS[index]
  }`;
};

export default formatBytes;
