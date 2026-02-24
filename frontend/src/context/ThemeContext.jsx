/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { THEMES, THEME_STORAGE_KEY } from "../theme/tokens";

const ThemeContext = createContext(null);

function resolveInitialTheme() {
  if (typeof window === "undefined") {
    return THEMES.LIGHT;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === THEMES.LIGHT || storedTheme === THEMES.DARK) {
    return storedTheme;
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  return mediaQuery.matches ? THEMES.DARK : THEMES.LIGHT;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(resolveInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle(THEMES.DARK, theme === THEMES.DARK);
    root.classList.toggle(THEMES.LIGHT, theme === THEMES.LIGHT);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK));
  };

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isDark: theme === THEMES.DARK
    }),
    [theme]
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