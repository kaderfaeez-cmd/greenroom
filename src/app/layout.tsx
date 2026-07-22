import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar, MobileBar } from "@/components/shell/Sidebar";
import { CommandPaletteProvider } from "@/components/shell/CommandPaletteContext";
import { CommandPalette } from "@/components/shell/CommandPalette";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Greenroom — interview preparation workspace", template: "%s · Greenroom" },
  description:
    "Paste a job description, get a complete interview preparation workspace: analysis, tailored questions, mock interviews, and STAR stories.",
};

/** Applies stored theme before first paint to avoid a flash of wrong theme. */
const themeScript = `(function(){try{var t=localStorage.getItem("greenroom-theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <CommandPaletteProvider>
          <Sidebar />
          <MobileBar />
          <main className="min-h-dvh md:pl-56">
            <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
          </main>
          <CommandPalette />
        </CommandPaletteProvider>
      </body>
    </html>
  );
}
