import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Serif } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import "@/styles/tokens.css";
import "@/styles/base.css";

const display = Instrument_Serif({ weight: "400", style: ["normal", "italic"], subsets: ["latin", "latin-ext"], variable: "--font-instrument-serif", display: "swap" });
const sans = IBM_Plex_Sans({ weight: ["400", "500", "600"], subsets: ["latin", "latin-ext"], variable: "--font-plex-sans", display: "swap" });
const mono = IBM_Plex_Mono({ weight: ["400", "500"], subsets: ["latin", "latin-ext"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Sidequest", template: "%s · Sidequest" },
  description: "Gerçek dünyada geçen bir zihin macerası. Dünya oyun tahtası. Eylemlerin oyunun kendisi. Keşfettiğin şey zihnin.",
};

export const viewport: Viewport = {
  themeColor: "#f3efe6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          İçeriğe geç
        </a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
