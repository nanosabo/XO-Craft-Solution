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

  try {
    created.webContents.debugger.attach("1.3");
  } catch {
    // The fallback readPage path still works for regular pages.
  }

  created.on("closed", () => {
    if (browserWindow === created) {
      browserWindow = null;
    }
  });

  browserWindow = created;

  return created;
};

/**
 * Drops the hidden window. A stalled API response keeps the underlying
 * connection open, which blocks the next navigation for tens of seconds, so a
 * truncated response is handled by recreating the window (the persistent
 * session keeps the anti-bot cookies).
 */
const resetWindow = (win: BrowserWindow): void => {
  if (browserWindow === win) {
    browserWindow = null;
  }

  if (!win.isDestroyed()) {
    win.destroy();
  }
};

interface PageState extends CrossoutPage {
  ready: boolean;
}

const readPageScript = `({
  title: document.title || "",
  text: document.body ? document.body.innerText || "" : "",
  ready: document.readyState !== "loading"
})`;

const readPage = async (win: BrowserWindow): Promise<PageState> => {
  const debuggerApi = win.webContents.debugger;

  // webContents.executeJavaScript waits for the document to finish loading.
  // The English mirror stalls on large API responses, so the document stays in
  // the "loading" state for tens of seconds even though the body is already
  // readable. The DevTools protocol can evaluate in the page immediately.
  if (debuggerApi.isAttached()) {
    try {
      const response = (await debuggerApi.sendCommand("Runtime.evaluate", {
        expression: readPageScript,
        returnByValue: true,
      })) as { result?: { value?: PageState } };

      if (response.result?.value) {
        return response.result.value;
      }
    } catch {
      // Fall back to executeJavaScript below.
    }
  }

  try {
    return (await win.webContents.executeJavaScript(
      readPageScript,
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

const sameNavigation = (current: string, url: string): boolean => {
  try {
    const currentUrl = new URL(current);
    const targetUrl = new URL(url);

    return (
      currentUrl.origin === targetUrl.origin &&
      currentUrl.pathname.replace(/\/+$/, "") ===
        targetUrl.pathname.replace(/\/+$/, "")
    );
  } catch {
    return false;
  }
};

const waitForPage = async (
  win: BrowserWindow,
  url: string,
  getFailure: () => Error | null,
): Promise<CrossoutPage> => {
  const startedAt = Date.now();
  let last: PageState = { title: "", text: "", ready: false };
  let lastLength = -1;
  let stableCount = 0;

  while (Date.now() - startedAt < LOAD_TIMEOUT) {
    const failure = getFailure();

    if (failure) throw failure;
    // A failed navigation leaves the previous page in the window. Do not read
    // it as the requested page: that would silently return data from another
    // host or another log.
    if (sameNavigation(win.webContents.getURL(), url)) {
      last = await readPage(win);

      const text = last.text.trim();
      const isJson = text.startsWith("{") || text.startsWith("[");

      // API responses are rendered as a JSON text document. A complete JSON
      // body can be used before the browser marks the document as loaded.
      if (isJson && (text.endsWith("}") || text.endsWith("]"))) {
        return { title: last.title, text: last.text };
      }

      const canRead = Boolean(text) && !isChallenge(last);

      // Both the English mirror and some of its HTML pages can keep the
      // document in the "loading" state for tens of seconds after the body is
      // already readable (a stalled subresource or API stream). Treat a body
      // that stopped growing as complete instead of waiting for the timeout.
      if (canRead) {
        if (text.length === lastLength) {
          stableCount += 1;
        } else {
          lastLength = text.length;
          stableCount = 0;
        }

        if (stableCount >= 6) {
          if (isJson) {
            resetWindow(win);
          } else {
            win.webContents.stop();
          }

          return { title: last.title, text: last.text };
        }
      } else {
        lastLength = -1;
        stableCount = 0;
      }

      if (last.ready && canRead) {
        if (isJson) {
          resetWindow(win);
        } else {
          win.webContents.stop();
        }

        return { title: last.title, text: last.text };
      }
    }

    await sleep(POLL_INTERVAL);
  }

  throw new Error("Страница crossout-info.com не загрузилась вовремя.");
};

const load = async (url: string): Promise<CrossoutPage> => {
  const win = getWindow();

  // Abort a previous navigation that may still be streaming (the English
  // mirror stalls on large API responses) before starting the next one.
  win.webContents.stop();

  // A dead host (ERR_ADDRESS_UNREACHABLE and the like) rejects loadURL at
  // once. Swallowing that rejection left the poll waiting out the full
  // timeout on the previous page, so the English mirror was never tried.
  let failure: Error | null = null;

  const onFail = (
    _event: Electron.Event,
    errorCode: number,
    _description: string,
    validatedURL: string,
    isMainFrame: boolean,
  ) => {
    // -3 is ERR_ABORTED, raised by stop() when the previous navigation is
    // cancelled. Subframes fail independently of the document we asked for.
    if (!isMainFrame || errorCode === -3) return;
    if (!sameNavigation(validatedURL, url)) return;

    failure = new Error(`Не удалось открыть ${url}`);
  };

  win.webContents.on("did-fail-load", onFail);

  const pending = win.loadURL(url).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("ERR_ABORTED")) return;

    failure = error instanceof Error ? error : new Error(message);
  });

  try {
    return await waitForPage(win, url, () => failure);
  } finally {
    win.webContents.removeListener("did-fail-load", onFail);
    void pending;
  }
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
