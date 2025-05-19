import { nativeTheme } from "electron";
import { ipcMain } from "electron";
import {
  THEME_MODE_CURRENT_CHANNEL,
  THEME_MODE_DARK_CHANNEL,
  THEME_MODE_LIGHT_CHANNEL,
  THEME_MODE_SYSTEM_CHANNEL,
  THEME_MODE_TOGGLE_CHANNEL,
} from "./theme-channels";

export function addThemeEventListeners() {
  ipcMain.handle(THEME_MODE_CURRENT_CHANNEL, () => {
    nativeTheme.themeSource = "dark"; // Enforce on query
    return "dark"; // Report 'dark' to renderer
  });

  ipcMain.handle(THEME_MODE_TOGGLE_CHANNEL, () => {
    nativeTheme.themeSource = "dark";
    return true; // Tell renderer it's dark mode
  });

  ipcMain.handle(THEME_MODE_DARK_CHANNEL, () => {
    nativeTheme.themeSource = "dark";
  });

  // If renderer attempts to set light mode, force dark mode.
  ipcMain.handle(THEME_MODE_LIGHT_CHANNEL, () => {
    nativeTheme.themeSource = "dark";
  });

  // If renderer attempts to set system theme, force dark mode.
  ipcMain.handle(THEME_MODE_SYSTEM_CHANNEL, () => {
    nativeTheme.themeSource = "dark";
    return true; // Tell renderer it's dark mode (as per forced setting)
  });
}
