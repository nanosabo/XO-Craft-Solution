const pad = (value: number) => String(value).padStart(2, "0");

export const parseUploadDate = (value: string): number => {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());

  if (!match) return 0;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return 0;
  }

  return date.getTime();
};

export const timeZoneLabel = (): string => {
  const minutes = -new Date().getTimezoneOffset();
  const sign = minutes >= 0 ? "+" : "-";
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const rest = absolute % 60;

  return rest
    ? `GMT${sign}${hours}:${pad(rest)}`
    : `GMT${sign}${hours}`;
};

export const normalizeMap = (value: string): string =>
  value.trim().toLowerCase().replace(/[\s-]+/g, "_");

export const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = Math.floor(seconds % 60);

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(rest)}`
    : `${minutes}:${pad(rest)}`;
};

export const formatBattleDuration = (value: string) => {
  const minutes = /(\d+)\s*(?:м|m|min)\.?\s*(\d+)\s*(?:с|s|sec)\.?/i.exec(value);

  if (minutes) {
    return formatDuration(Number(minutes[1]) * 60 + Number(minutes[2]));
  }

  const clock = /^(\d+):(\d{1,2})$/.exec(value.trim());

  if (clock) {
    return formatDuration(Number(clock[1]) * 60 + Number(clock[2]));
  }

  return value;
};
