import { BrowserWindow, session } from "electron";

const PARTITION = "persist:crossout-info";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const LOAD_TIMEOUT = 45_000;
const POLL_INTERVAL = 500;
const CHALLENGE_MARKERS = [
  "Проверка браузера",
  "Выполняется вычисление",
  "Browser check",
  "Checking your browser",
];

export interface CrossoutPage {
  title: string;
  text: string;
}

let browserWindow: BrowserWindow | null = null;
let queue: Promise<unknown> = Promise.resolve();

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getWindow = (): BrowserWindow => {
  if (browserWindow && !browserWindow.isDestroyed()) {
    return browserWindow;
  }

  const ses = session.fromPartition(PARTITION);

  ses.setUserAgent(USER_AGENT);

  const created = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    webPreferences: {
      partition: PARTITION,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  created.webContents.setUserAgent(USER_AGENT);
  created.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  created.on("closed", () => {
    if (browserWindow === created) {
      browserWindow = null;
    }
  });

  browserWindow = created;

  return created;
};

interface PageState extends CrossoutPage {
  ready: boolean;
}

const readPage = async (win: BrowserWindow): Promise<PageState> => {
  try {
    return (await win.webContents.executeJavaScript(
      `({
        title: document.title || "",
        text: document.body ? document.body.innerText || "" : "",
        ready: document.readyState === "complete"
      })`,
      true,
    )) as PageState;
  } catch {
    return { title: "", text: "", ready: false };
  }
};

const isChallenge = (page: CrossoutPage): boolean => {
  const haystack = `${page.title}\n${page.text}`.toLowerCase();

  return CHALLENGE_MARKERS.some((marker) =>
    haystack.includes(marker.toLowerCase()),
  );
};

const waitForPage = async (win: BrowserWindow): Promise<CrossoutPage> => {
  const startedAt = Date.now();
  let last: PageState = { title: "", text: "", ready: false };

  while (Date.now() - startedAt < LOAD_TIMEOUT) {
    last = await readPage(win);

    if (last.ready && last.text.trim() && !isChallenge(last)) {
      return { title: last.title, text: last.text };
    }

    await sleep(POLL_INTERVAL);
  }

  throw new Error("Страница crossout-info.com не загрузилась вовремя.");
};

const load = async (url: string): Promise<CrossoutPage> => {
  const win = getWindow();

  try {
    await win.loadURL(url);
  } catch {
    // The anti-bot page can abort the first navigation and reload itself.
    // The polling loop below waits for the final page.
  }

  return waitForPage(win);
};

const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
  const run = () => task();
  const result = queue.then(run, run);

  queue = result.then(
    () => undefined,
    () => undefined,
  );

  return result;
};

/**
 * Loads a crossout-info page through a hidden Chromium window. The site
 * protects API and log pages with a JavaScript challenge, so plain HTTP
 * requests are rejected with 403; a real browser session solves it once and
 * then reuses the cookie.
 */
export const loadCrossoutPage = (url: string): Promise<CrossoutPage> =>
  enqueue(() => load(url));

export const extractCrossoutPage = <T>(
  url: string,
  script: string,
): Promise<CrossoutPage & { value: T }> =>
  enqueue(async () => {
    const page = await load(url);
    const win = getWindow();
    const value = (await win.webContents.executeJavaScript(
      script,
      true,
    )) as T;

    return { ...page, value };
  });

export const closeCrossoutBrowser = (): void => {
  if (browserWindow && !browserWindow.isDestroyed()) {
    browserWindow.destroy();
  }

  browserWindow = null;
};
