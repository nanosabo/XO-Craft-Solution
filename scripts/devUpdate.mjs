import { spawn } from "node:child_process";

/**
 * Starts the regular Vite dev server with the updater mock enabled.
 * Pass a scenario to preview a specific state, e.g.
 * `XO_UPDATE_MOCK=downloading yarn dev:update`.
 */
const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["vite"], {
  stdio: "inherit",
  env: {
    ...process.env,
    XO_UPDATE_MOCK: process.env.XO_UPDATE_MOCK || "1",
  },
});

child.on("exit", (code) => process.exit(code ?? 0));
