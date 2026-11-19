import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { isStartScreen, type StartScreen } from "@src/helpers/startScreen";
import {
  DEFAULT_TEAM_COLORS,
  isHexColor,
  type Team,
  type TeamColors,
} from "@src/helpers/teamColors";
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
  signalPriceEnabled: boolean;
  signalCraftEnabled: boolean;
  signal: NotificationSignal;
  customSoundName: string | null;
}

/** How much price history the market price scale treats as "usual". */
export const PRICE_SCALE_PERIODS = [2, 3, 6] as const;

export type PriceScalePeriod = (typeof PRICE_SCALE_PERIODS)[number];

export const DEFAULT_PRICE_SCALE_PERIOD: PriceScalePeriod = 2;

export const isPriceScalePeriod = (value: unknown): value is PriceScalePeriod =>
  PRICE_SCALE_PERIODS.includes(value as PriceScalePeriod);

export interface SettingsState {
  inventory: Record<string, number>;
  inventoryEnabled: boolean;
  analog: AnalogTolerances;
  notifications: MarketNotificationSettings;
  /** Months of history used by the "cheap / usual / expensive" scale. */
  priceScalePeriod: PriceScalePeriod;
  autoUpdate: boolean;
  /** Marked parts on the solution screen stay through a recalculation. */
  keepInstalledParts: boolean;
  /** Parts the solver must never suggest, until they are restored. */
  excludedParts: string[];
  /** When on, the hidden list stays saved but is used in calculations again. */
  considerExcludedParts: boolean;
  /**
   * Left and right parts are chosen together, in equal counts.
   * Parts without a pair keep their own limit, including 1 and 3.
   */
  symmetryMode: boolean;
  /** Folder that contains combat.log, or the log file itself. */
  crossoutLogsPath: string | null;
  /** Page opened after the first load. */
  startScreen: StartScreen;
  /** When on, alerts use the operating system instead of the in-app toasts. */
  systemNotifications: boolean;
  /** When on, closing the window keeps the app running in the system tray. */
  runInBackground: boolean;
  /** Nickname row colors of the combat log tables. */
  teamColors: TeamColors;
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
    signalPriceEnabled: true,
    signalCraftEnabled: true,
    signal: "coins",
    customSoundName: null,
  },
  priceScalePeriod: DEFAULT_PRICE_SCALE_PERIOD,
  autoUpdate: true,
  keepInstalledParts: true,
  excludedParts: [],
  considerExcludedParts: false,
  symmetryMode: false,
  crossoutLogsPath: null,
  startScreen: "craft",
  systemNotifications: false,
  runInBackground: true,
  teamColors: { ...DEFAULT_TEAM_COLORS },
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

    notifications.signalPriceEnabled =
      notifications.signalPriceEnabled !== false;
    notifications.signalCraftEnabled =
      notifications.signalCraftEnabled !== false;

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

    const teamColors: Partial<TeamColors> = parsed.teamColors ?? {};

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
      symmetryMode: parsed.symmetryMode === true,
      crossoutLogsPath: logsPath || null,
      startScreen: isStartScreen(parsed.startScreen)
        ? parsed.startScreen
        : defaults.startScreen,
      systemNotifications: parsed.systemNotifications === true,
      runInBackground: parsed.runInBackground !== false,
      priceScalePeriod: isPriceScalePeriod(parsed.priceScalePeriod)
        ? parsed.priceScalePeriod
        : defaults.priceScalePeriod,
      teamColors: {
        ally: isHexColor(teamColors.ally)
          ? teamColors.ally
          : defaults.teamColors.ally,
        enemy: isHexColor(teamColors.enemy)
          ? teamColors.enemy
          : defaults.teamColors.enemy,
      },
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
    setPriceScalePeriod(state, action: PayloadAction<PriceScalePeriod>) {
      state.priceScalePeriod = action.payload;
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
    setSymmetryMode(state, action: PayloadAction<boolean>) {
      state.symmetryMode = action.payload;
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
    setRunInBackground(state, action: PayloadAction<boolean>) {
      state.runInBackground = action.payload !== false;
      saveSettings(state);
    },
    setTeamColor(state, action: PayloadAction<{ team: Team; color: string }>) {
      if (!isHexColor(action.payload.color)) return;

      state.teamColors[action.payload.team] = action.payload.color.toLowerCase();
      saveSettings(state);
    },
    resetTeamColors(state) {
      state.teamColors = { ...DEFAULT_TEAM_COLORS };
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
  setPriceScalePeriod,
  setKeepInstalledParts,
  banExcludedPart,
  restoreExcludedPart,
  clearExcludedParts,
  setConsiderExcludedParts,
  setSymmetryMode,
  setCrossoutLogsPath,
  setStartScreen,
  setSystemNotifications,
  setRunInBackground,
  setTeamColor,
  resetTeamColors,
  resetSettings,
} = settingsSlice.actions;

export const selectSettingsState = (state: RootState) => state.settings;

export default settingsSlice.reducer;
