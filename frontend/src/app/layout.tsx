import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";

const themeInitScript = `try { var t = localStorage.getItem("sentinel-theme"); var a = localStorage.getItem("sentinel-accent"); document.documentElement.dataset.theme = t === "dark" ? "dark" : "light"; document.documentElement.dataset.accent = ["emerald", "blue", "violet", "rose"].includes(a) ? a : "emerald"; } catch (_) {}`;

export const metadata: Metadata = {
  title: "Sentinel | Website monitoring",
  description: "A clear view of your website monitoring status.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeInitScript }}/></head><body><ThemeProvider><SessionProvider>{children}</SessionProvider></ThemeProvider></body></html>;
}
