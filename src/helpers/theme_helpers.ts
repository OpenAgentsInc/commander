import { ThemeMode } from "@/types/theme-mode";

const THEME_KEY = "theme";

export interface ThemePreferences {
  system: ThemeMode;
  local: ThemeMode | null;
}

export async function getCurrentTheme(): Promise<ThemePreferences> {
  const systemTheme = await window.themeMode.current();
  return {
    system: systemTheme,
    local: "dark", // Application forces 'dark'
  };
}

export async function setTheme(_newTheme: ThemeMode) { // newTheme parameter is ignored
  await window.themeMode.dark(); // Instruct main process to set nativeTheme to dark
  updateDocumentTheme(true);     // Apply 'dark' class to HTML element
  localStorage.setItem(THEME_KEY, "dark"); // Persist 'dark' as the chosen theme
}

export async function toggleTheme() {
  await setTheme("dark"); // Always (re)set to dark mode
}

export async function syncThemeWithLocal() {
  await setTheme("dark"); // Force dark mode on startup
}

function updateDocumentTheme(isDarkMode: boolean) {
  // Force isDarkMode to true.
  // This ensures the 'dark' class is always applied for Tailwind CSS.
  document.documentElement.classList.add("dark");
  // Explicitly remove 'light' class if it might exist from previous versions or other logic
  document.documentElement.classList.remove("light");
}
