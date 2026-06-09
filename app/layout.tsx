import type { Metadata } from "next";
import { Orbitron, Outfit } from "next/font/google";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { LocaleProvider } from "@/components/LocaleProvider";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Agent Poker",
  description:
    "Bring-your-own-agent Texas Hold'em. Train your agent, join a room, watch it play.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${orbitron.variable}`}>
      <body className="font-sans antialiased">
        <LocaleProvider>
          <div className="lang-switcher fixed z-50">
            <LanguageSwitcher />
          </div>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
