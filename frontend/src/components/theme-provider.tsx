"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark";
export type AccentPalette = "emerald" | "blue" | "violet" | "rose";

type ThemeContextValue = {
  theme: ThemeMode;
  palette: AccentPalette;
  setTheme: (theme: ThemeMode) => void;
  setPalette: (palette: AccentPalette) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const palettes: AccentPalette[] = ["emerald", "blue", "violet", "rose"];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [palette, setPalette] = useState<AccentPalette>("emerald");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("sentinel-theme");
    const savedPalette = window.localStorage.getItem("sentinel-accent");
    const nextTheme: ThemeMode = savedTheme === "dark" ? "dark" : "light";
    const nextPalette: AccentPalette = palettes.includes(savedPalette as AccentPalette) ? savedPalette as AccentPalette : "emerald";
    setTheme(nextTheme);
    setPalette(nextPalette);
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.dataset.accent = nextPalette;
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.accent = palette;
    window.localStorage.setItem("sentinel-theme", theme);
    window.localStorage.setItem("sentinel-accent", palette);
  }, [theme, palette, ready]);

  const value = useMemo(() => ({ theme, palette, setTheme, setPalette }), [theme, palette]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}