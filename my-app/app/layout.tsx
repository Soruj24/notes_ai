import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/src/components/providers/Providers";
import { ThemeScript } from "@/src/components/providers/ThemeScript";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "NotoAI",
    template: "%s · NotoAI",
  },
  description: "AI-powered personal productivity: notes, tasks, calendar, and insights.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { getSettingValue } = await import("@/src/lib/settings/state");
  const theme = await getSettingValue<string>("appearance.theme", "system");
  const defaultTheme = theme === "light" || theme === "dark" ? theme : ("system" as const);
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh bg-white text-zinc-950 antialiased dark:bg-black dark:text-zinc-50">
        <Providers defaultTheme={defaultTheme}>{children}</Providers>
      </body>
    </html>
  );
}
