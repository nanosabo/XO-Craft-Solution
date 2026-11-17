import axios from "axios";

const REPO = "nanosabo/XO-Craft-Solution";
const REQUEST_TIMEOUT = 15000;

export interface ReleaseNotes {
  body: string;
  /** The Atom feed returns ready-made HTML, the REST API returns markdown. */
  html: boolean;
}

interface Release {
  body: string;
}

interface StoredUpdateInfo {
  version: string;
  releaseNotes: string | null;
}

const looksLikeHtml = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value);

type PreviewListener = (version: string) => void;

const previewListeners = new Set<PreviewListener>();

/** Opens the patch-notes window for a version that is not installed yet. */
export const openReleasePreview = (version: string) => {
  const next = version.trim().replace(/^v/i, "");

  if (!next) return;

  previewListeners.forEach((listener) => listener(next));
};

export const subscribeReleasePreview = (listener: PreviewListener) => {
  previewListeners.add(listener);

  return () => {
    previewListeners.delete(listener);
  };
};

const fetchFromApi = async (version: string): Promise<ReleaseNotes | null> => {
  try {
    const { data } = await axios.get<Release>(
      `https://api.github.com/repos/${REPO}/releases/tags/v${version}`,
      { timeout: REQUEST_TIMEOUT },
    );

    return data.body ? { body: data.body, html: false } : null;
  } catch {
    return null;
  }
};

/**
 * github.com serves the same release notes as an Atom feed. Unlike the REST API
 * it has no anonymous rate limit, and it stays reachable wherever the app can
 * download its updates. The feed is fetched by the main process because it is
 * served without CORS headers.
 */
const fetchFromAtom = async (version: string): Promise<ReleaseNotes | null> => {
  try {
    const data = await window.electronAPI.getReleaseFeed();

    if (!data) return null;

    const doc = new DOMParser().parseFromString(data, "application/xml");
    const entry = Array.from(doc.querySelectorAll("entry")).find((item) =>
      item
        .querySelector("link")
        ?.getAttribute("href")
        ?.endsWith(`/tag/v${version}`),
    );

    const body = entry?.querySelector("content")?.textContent?.trim();

    return body ? { body, html: true } : null;
  } catch {
    return null;
  }
};

export const fetchReleaseFor = async (
  version: string,
): Promise<ReleaseNotes | null> => {
  try {
    const next = version.trim().replace(/^v/i, "");

    if (!next) return null;

    // Notes cached by the updater before the app was restarted.
    const cached: StoredUpdateInfo | null = window.electronAPI.getUpdateInfo
      ? await window.electronAPI.getUpdateInfo()
      : null;

    if (cached?.version === next && cached.releaseNotes) {
      return { body: cached.releaseNotes, html: looksLikeHtml(cached.releaseNotes) };
    }

    return (await fetchFromApi(next)) ?? (await fetchFromAtom(next));
  } catch {
    return null;
  }
};

export const fetchRelease = async (): Promise<ReleaseNotes | null> => {
  const version = await window.electronAPI.getVersion();

  return fetchReleaseFor(version);
};

export const showVersion = async () => {
  const current = await window.electronAPI.getVersion();
  const saved = localStorage.getItem("version");
  return current !== saved;
};

export const saveCurrentVersion = async () => {
  const current = await window.electronAPI.getVersion();
  localStorage.setItem("version", current);
};
