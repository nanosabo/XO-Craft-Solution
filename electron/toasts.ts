import {
  app,
  BrowserWindow,
  ipcMain,
  nativeImage,
  Notification,
  powerMonitor,
  screen,
} from "electron";
import fs from "fs";
import path from "node:path";
import type { UiLanguage } from "./language";

export interface ToastPayload {
  title: string;
  body: string;
  icon?: string;
}

interface ToastMessage extends ToastPayload {
  id: string;
  closeLabel: string;
  clearLabel: string;
}

interface ToastOptions {
  getWindow: () => BrowserWindow | null;
  getLanguage: () => UiLanguage;
  iconPath: string;
}

const TOAST_WIDTH = 360;
const TOAST_MARGIN = 8;
/** Fits four cards and the clear button, so the window never has to resize. */
const STACK_HEIGHT = 640;
const CLOSE_LABEL: Record<UiLanguage, string> = {
  ru: "Закрыть",
  en: "Close",
  uk: "Закрити",
};

const CLEAR_LABEL: Record<UiLanguage, string> = {
  ru: "Очистить все",
  en: "Clear all",
  uk: "Очистити всі",
};

let options: ToastOptions | null = null;
let toastWin: BrowserWindow | null = null;
let toastReady = false;
let systemNotifications = false;
let currentHeight = 0;
let contentHeight = 0;
let anchoredDisplay = -1;
let revealed = false;
let revealTimer: ReturnType<typeof setTimeout> | null = null;
let sequence = 0;
const pending: ToastMessage[] = [];
const anchoredWindows = new WeakSet<BrowserWindow>();

const modePath = () =>
  path.join(app.getPath("userData"), "notification-mode.json");

const readSystemMode = () => {
  try {
    const parsed = JSON.parse(fs.readFileSync(modePath(), "utf8")) as {
      systemNotifications?: boolean;
    };

    return parsed.systemNotifications === true;
  } catch {
    return false;
  }
};

const writeSystemMode = (enabled: boolean) => {
  try {
    fs.writeFileSync(
      modePath(),
      JSON.stringify({ systemNotifications: enabled }),
    );
  } catch (error) {
    console.error("Failed to save notification mode:", error);
  }
};

const appIconDataUrl = () => {
  if (!options) return undefined;

  try {
    const image = nativeImage.createFromPath(options.iconPath);

    return image.isEmpty() ? undefined : image.toDataURL();
  } catch {
    return undefined;
  }
};

const safeIcon = (icon?: string) => {
  if (
    icon &&
    icon.startsWith("data:image/") &&
    icon.length < 1_500_000
  ) {
    return icon;
  }

  return appIconDataUrl();
};

const cleanText = (value: unknown, max: number) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const displayOfApp = () => {
  const window = options?.getWindow() ?? null;

  if (window && !window.isDestroyed()) {
    const bounds = window.isMinimized()
      ? window.getNormalBounds()
      : window.getBounds();

    return screen.getDisplayMatching(bounds);
  }

  return screen.getPrimaryDisplay();
};

const focusApp = () => {
  const window = options?.getWindow() ?? null;

  if (!window || window.isDestroyed()) return;

  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
};

const placeToastWindow = () => {
  if (!toastWin || toastWin.isDestroyed()) return;

  const display = displayOfApp();
  const area = display.workArea;
  const nextHeight = Math.min(
    STACK_HEIGHT,
    Math.max(1, area.height - TOAST_MARGIN * 2),
  );
  const width = Math.min(TOAST_WIDTH, Math.max(220, area.width - TOAST_MARGIN * 2));
  const bounds = {
    x: Math.round(area.x + area.width - width - TOAST_MARGIN),
    y: Math.round(area.y + area.height - nextHeight - TOAST_MARGIN),
    width,
    height: nextHeight,
  };
  const current = toastWin.getBounds();

  anchoredDisplay = display.id;
  currentHeight = nextHeight;

  if (
    current.x === bounds.x &&
    current.y === bounds.y &&
    current.width === bounds.width &&
    current.height === bounds.height
  ) {
    return;
  }

  toastWin.setBounds(bounds);
  applyHitShape();
};

const revealToastWindow = () => {
  if (!toastWin || toastWin.isDestroyed() || currentHeight < 24) return;
  if (toastWin.isVisible()) return;

  const show = () => {
    revealTimer = null;

    if (!toastWin || toastWin.isDestroyed() || currentHeight < 24) return;
    if (toastWin.isVisible()) return;

    revealed = true;
    toastWin.showInactive();
    applyHitShape();
  };

  // A transparent window painted in the same tick it is created stays black
  // on Linux. The first show waits until the compositor has a frame.
  if (process.platform === "linux" && !revealed) {
    if (revealTimer) return;

    revealTimer = setTimeout(show, 80);
    return;
  }

  show();
};

const loadToastWindow = (window: BrowserWindow) => {
  const devServer = process.env["VITE_DEV_SERVER_URL"];

  if (devServer) {
    const url = new URL(devServer);
    url.searchParams.set("toast", "1");
    url.hash = "/toasts";
    void window.loadURL(url.toString());
    return;
  }

  void window.loadFile(path.join(process.env.DIST, "index.html"), {
    query: { toast: "1" },
    hash: "/toasts",
  });
};

const ensureToastWindow = () => {
  if (toastWin && !toastWin.isDestroyed()) return toastWin;

  toastReady = false;
  revealed = false;

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: TOAST_WIDTH,
    height: 120,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    closable: false,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    thickFrame: false,
    roundedCorners: false,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      devTools: !app.isPackaged,
    },
  };

  if (process.platform === "linux") windowOptions.type = "notification";
  if (process.platform === "darwin") {
    windowOptions.type = "panel";
    windowOptions.vibrancy = "under-window";
    windowOptions.visualEffectState = "active";
  }
  // Acrylic and mica paint the whole stack, including the empty area above
  // the cards, so Windows shows a tall gray panel behind a short toast.
  if (process.platform === "win32") windowOptions.backgroundMaterial = "none";

  toastWin = new BrowserWindow(windowOptions);
  toastWin.setAlwaysOnTop(true, "screen-saver");
  toastWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  toastWin.on("closed", () => {
    toastWin = null;
    toastReady = false;
    currentHeight = 0;
  });

  loadToastWindow(toastWin);
  return toastWin;
};

const deliver = (message: ToastMessage) => {
  if (!toastWin || toastWin.isDestroyed() || !toastReady) {
    pending.push(message);
    ensureToastWindow();
    return;
  }

  toastWin.webContents.send("toast-push", message);
};

const showSystemNotification = (payload: ToastPayload) => {
  if (!Notification.isSupported() || !options) return false;

  let notificationIcon: Electron.NativeImage | string = nativeImage.createFromPath(
    options.iconPath,
  );

  if (payload.icon?.startsWith("data:image/")) {
    try {
      const image = nativeImage.createFromDataURL(payload.icon);

      if (!image.isEmpty()) notificationIcon = image;
    } catch {
      /* Keep the application icon. */
    }
  }

  const notification = new Notification({
    title: payload.title,
    body: payload.body,
    icon: notificationIcon,
  });

  notification.on("click", () => {
    focusApp();
  });

  notification.show();
  return true;
};

const cancelReveal = () => {
  if (!revealTimer) return;

  clearTimeout(revealTimer);
  revealTimer = null;
};

/** Clicks land only on the stack. The empty area above falls through. */
const applyHitShape = () => {
  if (!toastWin || toastWin.isDestroyed()) return;
  if (process.platform === "darwin") return;

  const bounds = toastWin.getBounds();
  const hitHeight = Math.min(bounds.height, Math.max(0, contentHeight));

  if (hitHeight < 1) {
    toastWin.setShape([
      { x: 0, y: bounds.height, width: bounds.width, height: 0 },
    ]);
    return;
  }

  toastWin.setShape([
    {
      x: 0,
      y: Math.max(0, bounds.height - hitHeight),
      width: bounds.width,
      height: hitHeight,
    },
  ]);
};

const hideToastWindow = () => {
  currentHeight = 0;
  contentHeight = 0;
  cancelReveal();

  if (toastWin && !toastWin.isDestroyed()) {
    toastWin.hide();
  }
};

export const showAppNotification = (payload: ToastPayload) => {
  const title = cleanText(payload.title, 140);
  const body = cleanText(payload.body, 320);

  if (!title && !body) return false;

  const next = { title, body, icon: payload.icon };

  if (systemNotifications) return showSystemNotification(next);

  const language = options?.getLanguage() ?? "ru";

  deliver({
    ...next,
    icon: safeIcon(next.icon),
    id: `toast-${++sequence}`,
    closeLabel: CLOSE_LABEL[language],
    clearLabel: CLEAR_LABEL[language],
  });

  return true;
};

export const bindToastAnchor = (window: BrowserWindow) => {
  if (anchoredWindows.has(window)) return;

  anchoredWindows.add(window);

  const onPlace = () => {
    if (!toastWin || toastWin.isDestroyed() || !toastWin.isVisible()) return;
    if (currentHeight < 24) return;

    const display = screen.getDisplayMatching(
      window.isMinimized() ? window.getNormalBounds() : window.getBounds(),
    );

    if (display.id === anchoredDisplay) return;

    placeToastWindow();
  };

  window.on("move", onPlace);
  window.on("show", onPlace);
};

export const destroyToasts = () => {
  toastReady = false;
  pending.length = 0;
  currentHeight = 0;
  cancelReveal();

  if (toastWin && !toastWin.isDestroyed()) {
    toastWin.destroy();
  }

  toastWin = null;
};

export const initToasts = (next: ToastOptions) => {
  options = next;
  systemNotifications = readSystemMode();

  ipcMain.on("set-system-notifications", (_event, enabled: boolean) => {
    systemNotifications = enabled === true;
    writeSystemMode(systemNotifications);

    if (systemNotifications) {
      pending.length = 0;
      destroyToasts();
    }
  });

  ipcMain.on("toast-ready", (event) => {
    if (event.sender !== toastWin?.webContents) return;

    toastReady = true;
    const queued = pending.splice(0, pending.length);

    for (const message of queued) {
      event.sender.send("toast-push", message);
    }
  });

  ipcMain.on("toast-resize", (event, height: number) => {
    if (event.sender !== toastWin?.webContents || !toastWin) return;

    const nextHeight = Number(height);

    if (!Number.isFinite(nextHeight) || nextHeight < 24) {
      hideToastWindow();
      return;
    }

    contentHeight = Math.ceil(nextHeight);

    // Resizing a transparent window leaves a black band on Linux, so the
    // window is placed once and the cards move inside it.
    if (!toastWin.isVisible()) {
      placeToastWindow();
      toastWin.setAlwaysOnTop(true, "screen-saver");
      revealToastWindow();
    }

    applyHitShape();
  });

  ipcMain.on("toast-focus", (event) => {
    if (event.sender !== toastWin?.webContents) return;

    focusApp();
  });

  void app.whenReady().then(() => {
    screen.on("display-metrics-changed", () => {
      if (!toastWin || toastWin.isDestroyed() || !toastWin.isVisible()) return;
      if (currentHeight < 24) return;

      placeToastWindow();
    });
  });

  ipcMain.handle("get-idle-seconds", () => powerMonitor.getSystemIdleTime());
};
