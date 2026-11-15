import { app, BrowserWindow, screen } from "electron";
import type { Rectangle } from "electron";
import fs from "fs";
import path from "node:path";

export const MIN_WIDTH = 1160;
export const MIN_HEIGHT = 650;

// Up to this content size the layout simply stretches. Past it the whole UI
// grows proportionally, so a maximized window on 1440p is not tiny.
const SCALE_BASE_WIDTH = 1536;
const SCALE_BASE_HEIGHT = 864;
const MAX_ZOOM = 2.5;

export interface WindowState {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  maximized?: boolean;
}

export const UI_SCALES = [0.8, 0.9, 1, 1.1, 1.25] as const;

const uiScalePath = () => path.join(app.getPath("userData"), "ui-scale.json");
const scaleListeners = new Set<() => void>();
let uiScale: number | null = null;

const isUiScale = (value: unknown): value is number =>
  typeof value === "number" && UI_SCALES.some((scale) => scale === value);

export const getUiScale = () => {
  if (uiScale !== null) return uiScale;

  uiScale = 1;

  try {
    const saved = JSON.parse(fs.readFileSync(uiScalePath(), "utf8"))?.scale;
    if (isUiScale(saved)) uiScale = saved;
  } catch {
    // No saved scale yet.
  }

  return uiScale;
};

export const setUiScale = (value: unknown) => {
  if (!isUiScale(value)) return getUiScale();

  uiScale = value;

  try {
    fs.writeFileSync(uiScalePath(), JSON.stringify({ scale: value }));
  } catch (err) {
    console.error("Failed to save UI scale:", err);
  }

  scaleListeners.forEach((listener) => listener());

  return uiScale;
};

export const zoomForSize = (width: number, height: number, scale = 1) => {
  const fit = Math.min(width / SCALE_BASE_WIDTH, height / SCALE_BASE_HEIGHT);
  const auto = Math.min(MAX_ZOOM, Math.max(1, fit));
  // The minimal window is designed for zoom 1: smaller scales never shrink it
  // further, and larger ones only apply while the window has room for them.
  const roomy = Math.min(width / MIN_WIDTH, height / MIN_HEIGHT);
  const zoom = Math.max(1, Math.min(auto * scale, roomy));

  return Math.round(zoom * 100) / 100;
};

const isVisibleOnSomeDisplay = (bounds: Rectangle) =>
  screen.getAllDisplays().some(({ workArea }) => {
    const overlapX =
      Math.min(bounds.x + bounds.width, workArea.x + workArea.width) -
      Math.max(bounds.x, workArea.x);
    const overlapY =
      Math.min(bounds.y + bounds.height, workArea.y + workArea.height) -
      Math.max(bounds.y, workArea.y);

    return overlapX >= 120 && overlapY >= 48;
  });

export const readWindowState = (statePath: string) => {
  const restored: {
    bounds: Partial<Rectangle> & { width: number; height: number };
    maximized: boolean;
  } = {
    bounds: { width: MIN_WIDTH, height: MIN_HEIGHT },
    maximized: false,
  };

  try {
    if (!fs.existsSync(statePath)) return restored;

    const state: WindowState = JSON.parse(fs.readFileSync(statePath, "utf8"));
    const width = Math.max(MIN_WIDTH, Math.round(state.width ?? MIN_WIDTH));
    const height = Math.max(MIN_HEIGHT, Math.round(state.height ?? MIN_HEIGHT));

    restored.bounds = { width, height };
    restored.maximized = state.maximized === true;

    if (typeof state.x === "number" && typeof state.y === "number") {
      const candidate = { x: state.x, y: state.y, width, height };

      if (isVisibleOnSomeDisplay(candidate)) restored.bounds = candidate;
    }
  } catch (err) {
    console.error("Failed to load window state:", err);
  }

  return restored;
};

export const writeWindowState = (win: BrowserWindow, statePath: string) => {
  if (win.isDestroyed()) return;

  // Normal bounds keep the size the window returns to after un-maximizing.
  const bounds = win.getNormalBounds();
  const state: WindowState = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    maximized: win.isMaximized(),
  };

  try {
    fs.writeFileSync(statePath, JSON.stringify(state));
  } catch (err) {
    console.error("Failed to save window state:", err);
  }
};

export const bindWindowScale = (win: BrowserWindow, statePath: string) => {
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  const applyZoom = () => {
    if (win.isDestroyed()) return;

    const { width, height } = win.getContentBounds();
    const zoom = zoomForSize(width, height, getUiScale());

    if (Math.abs(win.webContents.getZoomFactor() - zoom) > 0.001) {
      win.webContents.setZoomFactor(zoom);
    }
  };

  const sendMaximized = () => {
    if (win.isDestroyed()) return;

    win.webContents.send("window-maximized", win.isMaximized());
  };

  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => writeWindowState(win, statePath), 400);
  };

  const onResize = () => {
    applyZoom();
    scheduleSave();
  };

  const onMaximizeChange = () => {
    applyZoom();
    sendMaximized();
    scheduleSave();
  };

  win.setMinimumSize(MIN_WIDTH, MIN_HEIGHT);
  win.on("resize", onResize);
  win.on("move", scheduleSave);
  win.on("maximize", onMaximizeChange);
  win.on("unmaximize", onMaximizeChange);
  win.on("close", () => {
    if (saveTimer) clearTimeout(saveTimer);
    writeWindowState(win, statePath);
  });
  scaleListeners.add(applyZoom);
  win.on("closed", () => scaleListeners.delete(applyZoom));
  win.webContents.on("did-finish-load", () => {
    applyZoom();
    sendMaximized();
  });
  // Ctrl+wheel and Ctrl+= would fight the automatic scale.
  win.webContents.on("zoom-changed", () => applyZoom());
  win.webContents.on("before-input-event", (event, input) => {
    if (!(input.control || input.meta) || input.type !== "keyDown") return;

    if (["+", "=", "-", "_", "0"].includes(input.key)) event.preventDefault();
  });

  applyZoom();
};
