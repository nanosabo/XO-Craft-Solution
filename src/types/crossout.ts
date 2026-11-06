export type CrossoutBattleType =
  | "KV"
  | "PRT"
  | "PVP"
  | "PVE"
  | "HEL"
  | "ARCADE"
  | "BRAWL"
  | "CREATE";

export interface CrossoutBattleTypeOption {
  value: CrossoutBattleType;
  label: string;
}

export const CROSSOUT_BATTLE_TYPES: CrossoutBattleTypeOption[] = [
  { value: "KV", label: "Клановые бои" },
  { value: "PRT", label: "Противостояние" },
  { value: "PVP", label: "Миссии" },
  { value: "PVE", label: "Рейды" },
  { value: "HEL", label: "Бронелеты (не актуально)" },
  { value: "ARCADE", label: "Шаг вперёд" },
  { value: "BRAWL", label: "Потасовка" },
  { value: "CREATE", label: "Свой бой" },
];

export interface CrossoutMapOption {
  value: string;
  ru: string;
  en: string;
}

export const CROSSOUT_MAPS: CrossoutMapOption[] = [
  { value: "rockcity", ru: "Рок Сити", en: "Rock City" },
  { value: "cemetery_highway", ru: "Мертвое шоссе", en: "Dead Highway" },
  { value: "downtown", ru: "Восточный квартал", en: "Eastern Quarter" },
  { value: "geopp", ru: "Наукоград", en: "Science City" },
  { value: "arena_canyon", ru: "Ущелье El Diablo", en: "El Diablo Canyon" },
  { value: "powerplant", ru: "ТЭЦ", en: "Power Plant" },
  { value: "sulfur", ru: "Мирный атом", en: "Peaceful Atom" },
  { value: "miners_way", ru: "Чертовы рудники", en: "Devil's Mines" },
  { value: "island", ru: "Чистый остров", en: "Clean Island" },
  { value: "vulkan", ru: "Вулкан", en: "Volcano" },
  { value: "conflagration", ru: "Кольцо пепла", en: "Ring of Ash" },
  { value: "sinto", ru: "Синто-сити", en: "Sinto City" },
  { value: "factory", ru: "Фабрика", en: "Factory" },
  { value: "customgame_craterarena", ru: "Оазис", en: "Oasis" },
  { value: "holes", ru: "Плацдарм опустошителей", en: "Scavenger Outpost" },
  { value: "red_rocks_territory", ru: "Кровавые скалы", en: "Bloody Rocks" },
  { value: "iron_way_center", ru: "Контроль-17", en: "Control-17" },
  { value: "arizona_silo", ru: "Сломанная стрела", en: "Broken Arrow" },
  { value: "sand_crater", ru: "Кратер", en: "Crater" },
  { value: "tower", ru: "Безымянная башня", en: "Nameless Tower" },
  { value: "bridge", ru: "Мост", en: "Bridge" },
  { value: "lost_coast", ru: "Затерянный берег", en: "Lost Coast" },
  { value: "chemical_plant", ru: "Химический завод", en: "Chemical Plant" },
  { value: "zombie_escape_2", ru: "Северный путь", en: "Northern Path" },
  { value: "cityruin", ru: "Старый город", en: "Old Town" },
  { value: "sand_valley", ru: "Песчаная долина", en: "Sandy Valley" },
  { value: "building_yard3", ru: "Сектор EX", en: "Sector EX" },
  { value: "riverport", ru: "Кладбище кораблей", en: "Ship Graveyard" },
  { value: "iron_way", ru: "Восточный ретранслятор", en: "Eastern Relay" },
  { value: "abandoned_ship", ru: "Песчаный залив", en: "Sandy Gulf" },
  { value: "castle", ru: "Крепость", en: "Fortress" },
  { value: "arizona_castle", ru: "Гнев хана", en: "Khan's Wrath" },
  { value: "quarry", ru: "Мраморный карьер", en: "Marble Quarry" },
  { value: "rockcity_2bases", ru: "Каньон основателей", en: "Founders' Canyon" },
  { value: "port", ru: "Терминал-45", en: "Terminal-45" },
  {
    value: "customgame_fiery_river",
    ru: "Смертельная переправа",
    en: "Deadly Crossing",
  },
  {
    value: "customgame_mountain_lake",
    ru: "Горное озеро",
    en: "Mountain Lake",
  },
  { value: "desolate_city", ru: "Опустевший город", en: "Deserted City" },
  { value: "helicopter_zeppelin", ru: "Врата долины", en: "Valley Gate" },
  { value: "helicopter_gorge", ru: "Воздушная гавань", en: "Air Harbor" },
  { value: "helicopter_valley", ru: "Волчья застава", en: "Wolf Outpost" },
  {
    value: "helicopter_downtown",
    ru: "Восточный квартал",
    en: "Eastern Quarter",
  },
  { value: "helicopter_guilin", ru: "Святилище", en: "Sanctuary" },
  { value: "the_wall", ru: "Бастион Братства", en: "Brotherhood Bastion" },
  { value: "fuji", ru: "Нью-Фуджи", en: "New Fuji" },
  { value: "secret_height", ru: "Колыбель разума", en: "Cradle of Mind" },
];

export interface CrossoutBattle {
  nickname: string;
  /** Damage to important parts. */
  important: number;
  /** Player power score. */
  ur: number;
  damage: number;
  kill: number;
  death: number;
  score: number;
  /** Damage taken. */
  tank: number;
  weapon: string;
  /** 1 — win, 0 — loss. */
  win: number;
  /** Party number, 0 when the player is alone. */
  party: number;
  /** Battle duration in seconds. */
  timebattle: number;
  type: string;
  battle_id: number;
  teams: number;
  map: string;
  /** Battle date as a Unix timestamp in seconds. */
  date: number;
}

export interface CrossoutFetchBattlesParams {
  type: CrossoutBattleType;
  /** Start date in DD.MM.YYYY format. */
  from: string;
  /** End date in DD.MM.YYYY format. */
  to?: string;
  /** Internal map key to exclude from the result. */
  excludeMap?: string;
}

export type CrossoutErrorCode =
  | "no-key"
  | "unknown-type"
  | "invalid-from"
  | "invalid-to"
  | "to-before-from"
  | "range-too-long"
  | "unexpected-response"
  | "forbidden"
  | "network"
  | "server"
  | "no-file"
  | "file-not-found"
  | "not-a-file"
  | "file-too-large"
  | "file-read"
  | "empty-log-id";

export interface CrossoutBattlesResult {
  battles: CrossoutBattle[];
  /** Original service message, kept for diagnostics. */
  error: string | null;
  /** Stable code the renderer can localize. */
  errorCode: CrossoutErrorCode | null;
}

export interface CrossoutUploadLogParams {
  nickname: string;
  filePath: string;
}

export type CrossoutUploadLogResult =
  | { ok: true; logId: string; logUrl?: string }
  | { ok: false; error: string; errorCode: CrossoutErrorCode };
