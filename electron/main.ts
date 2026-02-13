import { app, BrowserWindow, globalShortcut, ipcMain, shell } from "electron";
import path from "node:path";
import { spawn } from "child_process";
import actualParts from "./actual_parts.json";
import { solveInputsState } from "@src/store/slices/solveInputs.slice";
import { requiredPart } from "@src/store/slices/requiredParts.slice";
import { fetchItems } from "./fetchItems";

const IS_DEV = !app.isPackaged;

const exePath = IS_DEV
  ? path.resolve(__dirname, "../build/solver/knapsack-solver.exe")
  : path.resolve(process.resourcesPath, "build/solver/knapsack-solver.exe");

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, "../dist");
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, "../public");

let win: BrowserWindow | null;
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];

function createWindow() {
  win = new BrowserWindow({
    width: 1160,
    height: 650,
    resizable: false,
    autoHideMenuBar: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      devTools: IS_DEV,
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
    win?.webContents.openDevTools();

    globalShortcut.register("F11", () => {});

    if (!IS_DEV) {
      globalShortcut.register("CommandOrControl+R", () => {});
    }
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on("minimize", (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  win?.minimize();
});

ipcMain.on("close", (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  win?.close();
});

ipcMain.on("openDiscordExternal", () => {
  shell.openExternal("https://discord.gg/2dWevuMVwZ");
});

interface DataToSolve {
  inputs: solveInputsState;
  requiredParts: requiredPart[];
  forbidden: requiredPart[];
}

interface SolveResultPart {
  id: string;
  name: string;
  eng_name: string;
  count: number;
}

interface SolveResult {
  solution: SolveResultPart[];
  totalWeight: number;
  totalPower: number;
  totalDurability: number;
  totalParts: number;
}

let interval: NodeJS.Timeout | null = null;

ipcMain.handle("market", async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);

  if (interval !== null) {
    clearInterval(interval);
  }

  interval = setInterval(
    async () => {
      const updated = await fetchItems();
      win?.webContents.send("update", updated);
    },
    1000 * 60 * 2.5,
  );

  return await fetchItems();
});

ipcMain.handle(
  "solve",
  async (_, { inputs, requiredParts, forbidden }: DataToSolve) => {
    const proc = spawn(exePath);

    const forbiddenNames = forbidden.map((part) => part.eng_name);
    const parts = actualParts.filter(
      (p) => !forbiddenNames.includes(p.eng_name),
    );

    /* ---------------- helpers ---------------- */

    const partsById = new Map(parts.map((p) => [p.id, p]));

    const requiredStats = requiredParts.reduce(
      (acc, rp) => {
        const part = partsById.get(rp.id);
        if (!part) return acc;

        const durability =
          part.build_hp !== part.durability ? part.build_hp : part.durability;

        acc.parts += rp.count;
        acc.power += part.power * rp.count;
        acc.weight += part.weight * rp.count;
        acc.durability += durability * rp.count;

        return acc;
      },
      { parts: 0, power: 0, weight: 0, durability: 0 },
    );

    /* ---------------- limits ---------------- */

    const dataToSolve = {
      maxPower:
        inputs.maxPowerScores - inputs.powerScores - requiredStats.power,
      maxWeight: inputs.tonnage - inputs.weight - requiredStats.weight - 1,
      maxParts: inputs.maxParts - inputs.parts - requiredStats.parts,
    };

    /* ---------------- prepare parts ---------------- */

    const partsPrepared = parts
      .map((p) => {
        const required = requiredParts.find((rp) => rp.id === p.id);
        return {
          ...p,
          maxCount: required ? p.maxCount - required.count : p.maxCount,
          durability: p.build_hp !== p.durability ? p.build_hp : p.durability,
        };
      })
      .filter(
        (p) =>
          (p.category === "Конструкции" || p.category === "Простреливаемые") &&
          p.durability >= inputs.minPartHp &&
          p.maxCount > 0,
      );

    const inputData = {
      ...dataToSolve,
      parts: partsPrepared,
    };

    /* ---------------- run solver ---------------- */

    const result: SolveResult = await new Promise((resolve, reject) => {
      proc.stdin.write(JSON.stringify(inputData));
      proc.stdin.end();

      let stdout = "";

      proc.stdout.on("data", (d) => (stdout += d.toString()));
      proc.stderr.on("data", (e) => console.error(e.toString()));

      proc.on("close", () => {
        try {
          const parsed = JSON.parse(stdout);

          const solutionMap = new Map<
            string,
            { id: string; name: string; eng_name: string; count: number }
          >();

          // solver result
          for (const [id, count] of Object.entries(parsed.solution)) {
            const part = partsById.get(id);
            if (!part) continue;

            solutionMap.set(id, {
              id,
              name: part.name,
              eng_name: part.eng_name,
              count: Number(count),
            });
          }

          // add required parts
          for (const rp of requiredParts) {
            const part = partsById.get(rp.id);
            if (!part) continue;

            const existing = solutionMap.get(rp.id);
            if (existing) {
              existing.count += rp.count;
            } else {
              solutionMap.set(rp.id, {
                id: rp.id,
                name: part.name,
                eng_name: part.eng_name,
                count: rp.count,
              });
            }
          }

          /* ---------------- totals ---------------- */

          let totalDurability = parsed.maxDurability + requiredStats.durability;

          if (inputs.durabilityCabin) totalDurability *= 1.1;
          if (inputs.coDriver) totalDurability *= 1.05;
          totalDurability += inputs.durability;

          resolve({
            solution: Array.from(solutionMap.values()),
            totalDurability: Math.round(totalDurability),
            totalWeight:
              parsed.totalWeight + inputs.weight + requiredStats.weight,
            totalPower:
              parsed.totalPower + inputs.powerScores + requiredStats.power,
            totalParts: parsed.totalParts + inputs.parts + requiredStats.parts,
          });
        } catch (err) {
          reject(err);
        }
      });
    });

    return result;
  },
);

ipcMain.handle("getParts", async () => {
  return actualParts;
});

ipcMain.handle("search-required-parts", async (_, value) => {
  return actualParts.filter(
    (part) =>
      part.name.toLowerCase().includes(value.toLowerCase()) ||
      part.eng_name.toLowerCase().includes(value.toLowerCase()),
  );
});

app.whenReady().then(createWindow);
