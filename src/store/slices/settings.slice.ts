import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { isStartScreen, type StartScreen } from "@src/helpers/startScreen";
import { RootState } from "../store";

export type NotificationSignal = "coins" | "radar" | "soft" | "custom";

export interface AnalogTolerances {
  power: number;
  weight: number;
  durability: number;
}

export interface MarketNotificationSettings {
  soundEnabled: boolean;
  priceDropEnabled: boolean;
  backgroundEnabled: boolean;
  signal: NotificationSignal;
  customSoundName: string | null;
}

export interface SettingsState {
  inventory: Record<string, number>;
  inventoryEnabled: boolean;
  analog: AnalogTolerances;
  notifications: MarketNotificationSettings;
  autoUpdate: boolean;
  /** Marked parts on the solution screen stay through a recalculation. */
  keepInstalledParts: boolean;
  /** Parts the solver must never suggest, until they are restored. */
  excludedParts: string[];
  /** When on, the hidden list stays saved but is used in calculations again. */
  considerExcludedParts: boolean;
  /** Folder that contains combat.log, or the log file itself. */
  crossoutLogsPath: string | null;
  /** Page opened after the first load. */
  startScreen: StartScreen;
  /** When on, alerts use the operating system instead of the in-app toasts. */
  systemNotifications: boolean;
}

export const SETTINGS_STORAGE_KEY = "settings";

export const createDefaultSettings = (): SettingsState => ({
  inventory: {},
  inventoryEnabled: true,
  analog: {
    power: 50,
    weight: 100,
    durability: 25,
  },
  notifications: {
    soundEnabled: true,
    priceDropEnabled: true,
    backgroundEnabled: true,
    signal: "coins",
    customSoundName: null,
  },
  autoUpdate: true,
  keepInstalledParts: true,
  excludedParts: [],
  considerExcludedParts: false,
  crossoutLogsPath: null,
  startScreen: "craft",
  systemNotifications: false,
});

const loadSettings = (): SettingsState => {
  const defaults = createDefaultSettings();

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;

    const parsed = JSON.parse(raw) as Partial<SettingsState>;

    // Older builds stored a single global threshold; it now lives per item.
    const notifications = {
      ...defaults.notifications,
      ...(parsed.notifications ?? {}),
    } as MarketNotificationSettings & { priceDropThreshold?: number };

    delete notifications.priceDropThreshold;

    if (
      typeof notifications.customSoundName !== "string" ||
      notifications.customSoundName.length === 0
    ) {
      notifications.customSoundName = null;
    }

    if (notifications.signal === "custom" && !notifications.customSoundName) {
      notifications.signal = "coins";
    }

    const logsPath =
      typeof parsed.crossoutLogsPath === "string"
        ? parsed.crossoutLogsPath.trim()
        : "";

    return {
      ...defaults,
      ...parsed,
      autoUpdate: parsed.autoUpdate !== false,
      keepInstalledParts:
        typeof parsed.keepInstalledParts === "boolean"
          ? parsed.keepInstalledParts
          : defaults.keepInstalledParts,
      inventoryEnabled:
        typeof parsed.inventoryEnabled === "boolean"
          ? parsed.inventoryEnabled
          : true,
      excludedParts: Array.isArray(parsed.excludedParts)
        ? parsed.excludedParts.filter(
            (id): id is string => typeof id === "string" && id.length > 0,
          )
        : [],
      considerExcludedParts: parsed.considerExcludedParts === true,
      crossoutLogsPath: logsPath || null,
      startScreen: isStartScreen(parsed.startScreen)
        ? parsed.startScreen
        : defaults.startScreen,
      systemNotifications: parsed.systemNotifications === true,
      inventory:
        parsed.inventory && typeof parsed.inventory === "object"
          ? parsed.inventory
          : {},
      analog: {
        ...defaults.analog,
        ...(parsed.analog ?? {}),
      },
      notifications,
    };
  } catch {
    return defaults;
  }
};

const saveSettings = (state: SettingsState) => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* Storage can be unavailable, settings still work for this session. */
  }
};

const initialState: SettingsState = loadSettings();

export const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setInventoryCount(
      state,
      action: PayloadAction<{ id: string; count: number }>,
    ) {
      state.inventory[action.payload.id] = Math.max(
        0,
        Math.floor(action.payload.count) || 0,
      );
      saveSettings(state);
    },
    removeInventoryItem(state, action: PayloadAction<string>) {
      delete state.inventory[action.payload];
      saveSettings(state);
    },
    clearInventory(state) {
      state.inventory = {};
      saveSettings(state);
    },
    setInventoryEnabled(state, action: PayloadAction<boolean>) {
      state.inventoryEnabled = action.payload;
      saveSettings(state);
    },
    setAnalogTolerance(
      state,
      action: PayloadAction<{ key: keyof AnalogTolerances; value: number }>,
    ) {
      state.analog[action.payload.key] = Math.max(
        0,
        Number.isFinite(action.payload.value) ? action.payload.value : 0,
      );
      saveSettings(state);
    },
    resetAnalogTolerances(state) {
      state.analog = createDefaultSettings().analog;
      saveSettings(state);
    },
    setNotificationSettings(
      state,
      action: PayloadAction<Partial<MarketNotificationSettings>>,
    ) {
      state.notifications = {
        ...state.notifications,
        ...action.payload,
      };
      saveSettings(state);
    },
    setAutoUpdate(state, action: PayloadAction<boolean>) {
      state.autoUpdate = action.payload;
      saveSettings(state);
    },
    setKeepInstalledParts(state, action: PayloadAction<boolean>) {
      state.keepInstalledParts = action.payload;
      saveSettings(state);
    },
    banExcludedPart(state, action: PayloadAction<string>) {
      if (!action.payload || state.excludedParts.includes(action.payload)) {
        return;
      }

      state.excludedParts.push(action.payload);
      saveSettings(state);
    },
    restoreExcludedPart(state, action: PayloadAction<string>) {
      state.excludedParts = state.excludedParts.filter(
        (id) => id !== action.payload,
      );
      saveSettings(state);
    },
    clearExcludedParts(state) {
      state.excludedParts = [];
      saveSettings(state);
    },
    setConsiderExcludedParts(state, action: PayloadAction<boolean>) {
      state.considerExcludedParts = action.payload;
      saveSettings(state);
    },
    setCrossoutLogsPath(state, action: PayloadAction<string | null>) {
      const value = action.payload?.trim() ?? "";

      state.crossoutLogsPath = value || null;
      saveSettings(state);
    },
    setStartScreen(state, action: PayloadAction<StartScreen>) {
      if (!isStartScreen(action.payload)) return;

      state.startScreen = action.payload;
      saveSettings(state);
    },
    setSystemNotifications(state, action: PayloadAction<boolean>) {
      state.systemNotifications = action.payload;
      saveSettings(state);
    },
    resetSettings() {
      const defaults = createDefaultSettings();
      saveSettings(defaults);
      return defaults;
    },
  },
});

export const {
  setInventoryCount,
  removeInventoryItem,
  clearInventory,
  setInventoryEnabled,
  setAnalogTolerance,
  resetAnalogTolerances,
  setNotificationSettings,
  setAutoUpdate,
  setKeepInstalledParts,
  banExcludedPart,
  restoreExcludedPart,
  clearExcludedParts,
  setConsiderExcludedParts,
  setCrossoutLogsPath,
  setStartScreen,
  setSystemNotifications,
  resetSettings,
} = settingsSlice.actions;

export const selectSettingsState = (state: RootState) => state.settings;

export default settingsSlice.reducer;
