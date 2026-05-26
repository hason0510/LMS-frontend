import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "theme";

function resolveInitialDarkMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const savedTheme = window.localStorage.getItem(STORAGE_KEY);
  if (savedTheme === "dark") {
    return true;
  }
  if (savedTheme === "light") {
    return false;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyThemeToDocument(isDarkMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle("dark", isDarkMode);
  document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
}

export function bootstrapTheme() {
  applyThemeToDocument(resolveInitialDarkMode());
}

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(resolveInitialDarkMode);

  useEffect(() => {
    applyThemeToDocument(isDarkMode);
    window.localStorage.setItem(STORAGE_KEY, isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const value = useMemo(
    () => ({
      isDarkMode,
      themeMode: isDarkMode ? "dark" : "light",
      setThemeMode: (mode) => setIsDarkMode(mode === "dark"),
      toggleTheme: () => setIsDarkMode((prev) => !prev),
    }),
    [isDarkMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
