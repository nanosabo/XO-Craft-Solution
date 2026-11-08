export type UiLanguage = "ru" | "en" | "uk";
export type ContentLanguage = "ru" | "en";

export const normalizeUiLanguage = (
  language: string | null | undefined,
): UiLanguage => {
  const value = (language ?? "").toLowerCase();

  if (value.startsWith("uk") || value.startsWith("ua")) return "uk";
  if (value.startsWith("ru")) return "ru";

  return "en";
};

/** Part, market and weapon names stay Russian while the interface is Ukrainian. */
export const contentLanguage = (
  language: string | null | undefined,
): ContentLanguage => (normalizeUiLanguage(language) === "en" ? "en" : "ru");
