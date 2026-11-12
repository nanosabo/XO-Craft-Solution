import { app } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface LaunchAtLoginState {
  enabled: boolean;
  /** False while developing: the executable there is Electron itself. */
  available: boolean;
}

const DESKTOP_FILE_NAME = "xo-craft-solution.desktop";

const unavailable = (): LaunchAtLoginState => ({
  enabled: false,
  available: false,
});

const autostartFile = () =>
  path.join(os.homedir(), ".config", "autostart", DESKTOP_FILE_NAME);

/** AppImage mounts a temporary binary; the real file is in APPIMAGE. */
const linuxLaunchPath = () => {
  const appImage = process.env.APPIMAGE;

  if (appImage && fs.existsSync(appImage)) return appImage;

  return process.execPath;
};

const quoteDesktopExec = (file: string) =>
  `"${file.replace(/(["\\])/g, "\\$1")}"`;

const readLinuxEnabled = (): boolean => {
  try {
    const text = fs.readFileSync(autostartFile(), "utf8");

    if (/^\s*X-GNOME-Autostart-enabled\s*=\s*false\s*$/im.test(text)) {
      return false;
    }

    if (/^\s*Hidden\s*=\s*true\s*$/im.test(text)) return false;

    return /^\s*Exec\s*=/im.test(text);
  } catch {
    return false;
  }
};

const writeLinuxAutostart = (enabled: boolean) => {
  const file = autostartFile();

  if (!enabled) {
    fs.rmSync(file, { force: true });
    return;
  }

  fs.mkdirSync(path.dirname(file), { recursive: true });

  const contents = [
    "[Desktop Entry]",
    "Type=Application",
    "Version=1.0",
    "Name=XO Craft Solution",
    `Exec=${quoteDesktopExec(linuxLaunchPath())}`,
    "Terminal=false",
    "X-GNOME-Autostart-enabled=true",
    "",
  ].join("\n");

  fs.writeFileSync(file, contents, "utf8");
};

const supportsLoginItemApi = () =>
  process.platform === "win32" || process.platform === "darwin";

/**
 * Windows and macOS use Electron's login-item API. Electron 26 has no Linux
 * implementation, so AppImage builds write an XDG autostart file instead.
 */
export const getLaunchAtLogin = (): LaunchAtLoginState => {
  if (!app.isPackaged) return unavailable();

  if (process.platform === "linux") {
    return { enabled: readLinuxEnabled(), available: true };
  }

  if (!supportsLoginItemApi()) return unavailable();

  const settings = app.getLoginItemSettings();
  const enabled =
    process.platform === "win32"
      ? settings.executableWillLaunchAtLogin
      : settings.openAtLogin;

  return { enabled, available: true };
};

export const setLaunchAtLogin = (enabled: boolean): LaunchAtLoginState => {
  if (!app.isPackaged) return unavailable();

  if (process.platform === "linux") {
    writeLinuxAutostart(enabled);
    return getLaunchAtLogin();
  }

  if (!supportsLoginItemApi()) return unavailable();

  app.setLoginItemSettings({
    openAtLogin: enabled,
    enabled,
  });

  return getLaunchAtLogin();
};
