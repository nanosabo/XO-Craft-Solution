import fs from "node:fs";
import path from "node:path";
import type { CrossoutDetectedLog } from "../src/types/crossout";

const CROSSOUT_APP_ID = "386180";
const LOG_NAME = "combat.log";

export interface CombatLogSearchRoots {
  home: string;
  documents?: string | null;
  localAppData?: string | null;
  winePrefix?: string | null;
  /** A folder the user picked, or a direct path to combat.log. */
  customLogsPath?: string | null;
}

const add = (roots: Set<string>, value: string | null | undefined) => {
  const trimmed = value?.trim();

  if (!trimmed) return;

  roots.add(path.normalize(trimmed));
};

const readLibraryPaths = async (steamRoot: string): Promise<string[]> => {
  const libraries = [steamRoot];
  const manifests = [
    path.join(steamRoot, "steamapps", "libraryfolders.vdf"),
    path.join(steamRoot, "config", "libraryfolders.vdf"),
  ];

  for (const manifest of manifests) {
    let text = "";

    try {
      text = await fs.promises.readFile(manifest, "utf8");
    } catch {
      continue;
    }

    for (const match of text.matchAll(/"path"\s+"([^"]+)"/g)) {
      libraries.push(match[1].replace(/\\\\/g, "\\"));
    }
  }

  return libraries;
};

const logsInsidePrefix = async (prefix: string): Promise<string[]> => {
  const usersDir = path.join(prefix, "drive_c", "users");
  let users: string[] = [];

  try {
    users = await fs.promises.readdir(usersDir);
  } catch {
    return [];
  }

  return users
    .filter((user) => user.toLowerCase() !== "public")
    .map((user) =>
      path.join(
        usersDir,
        user,
        "AppData",
        "Local",
        "Targem",
        "Crossout",
        "logs",
      ),
    );
};

const collectLogRoots = async (
  input: CombatLogSearchRoots,
): Promise<string[]> => {
  const roots = new Set<string>();
  const custom = input.customLogsPath?.trim();

  if (custom && path.basename(custom).toLowerCase() !== LOG_NAME) {
    add(roots, custom);
    add(roots, path.join(custom, "logs"));
    add(roots, path.join(custom, "Targem", "Crossout", "logs"));
  }

  add(
    roots,
    input.localAppData
      ? path.join(input.localAppData, "Targem", "Crossout", "logs")
      : null,
  );
  add(
    roots,
    path.join(input.home, "AppData", "Local", "Targem", "Crossout", "logs"),
  );

  if (input.documents) {
    add(
      roots,
      path.join(input.documents, "My Games", "Crossout", "logs"),
    );
  }

  const steamRoots = [
    path.join(input.home, ".steam", "steam"),
    path.join(input.home, ".steam", "root"),
    path.join(input.home, ".local", "share", "Steam"),
    path.join(
      input.home,
      ".var",
      "app",
      "com.valvesoftware.Steam",
      "data",
      "Steam",
    ),
    path.join(
      input.home,
      ".var",
      "app",
      "com.valvesoftware.Steam",
      ".local",
      "share",
      "Steam",
    ),
  ];
  const libraries = new Set<string>();

  for (const steamRoot of steamRoots) {
    for (const library of await readLibraryPaths(steamRoot)) {
      libraries.add(path.normalize(library));
    }
  }

  for (const library of libraries) {
    const prefix = path.join(
      library,
      "steamapps",
      "compatdata",
      CROSSOUT_APP_ID,
      "pfx",
    );

    for (const logs of await logsInsidePrefix(prefix)) {
      add(roots, logs);
    }
  }

  const winePrefixes = [
    input.winePrefix,
    path.join(input.home, ".wine"),
  ].filter((prefix): prefix is string => Boolean(prefix));

  for (const prefix of winePrefixes) {
    for (const logs of await logsInsidePrefix(prefix)) {
      add(roots, logs);
    }
  }

  return [...roots];
};

const consider = async (
  found: CrossoutDetectedLog[],
  filePath: string,
) => {
  try {
    const stats = await fs.promises.stat(filePath);

    if (!stats.isFile() || stats.size <= 0) return;

    found.push({
      filePath,
      session: path.basename(path.dirname(filePath)),
      modifiedAt: stats.mtimeMs,
    });
  } catch {
    return;
  }
};

const combatLogIn = async (
  found: CrossoutDetectedLog[],
  directory: string,
) => {
  let names: string[] = [];

  try {
    names = await fs.promises.readdir(directory);
  } catch {
    return;
  }

  const match = names.find((name) => name.toLowerCase() === LOG_NAME);

  if (!match) return;

  await consider(found, path.join(directory, match));
};

const scanLogsRoot = async (found: CrossoutDetectedLog[], root: string) => {
  let entries: fs.Dirent[] = [];

  try {
    entries = await fs.promises.readdir(root, { withFileTypes: true });
  } catch {
    return;
  }

  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(root, entry.name);

      if (entry.isFile() && entry.name.toLowerCase() === LOG_NAME) {
        await consider(found, fullPath);
        return;
      }

      if (entry.isDirectory()) {
        await combatLogIn(found, fullPath);
      }
    }),
  );
};

/**
 * Looks through the usual Crossout log folders, including a Steam Proton
 * prefix, and returns the combat.log that was written last.
 */
export const findLatestCombatLog = async (
  input: CombatLogSearchRoots,
): Promise<CrossoutDetectedLog | null> => {
  const roots = await collectLogRoots(input);
  const found: CrossoutDetectedLog[] = [];
  const custom = input.customLogsPath?.trim();

  if (custom && path.basename(custom).toLowerCase() === LOG_NAME) {
    await consider(found, custom);
  }

  await Promise.all(roots.map((root) => scanLogsRoot(found, root)));

  found.sort((left, right) => right.modifiedAt - left.modifiedAt);

  return found[0] ?? null;
};
