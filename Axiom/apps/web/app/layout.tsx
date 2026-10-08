import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Axiom — Yapay zekanın uydurduğu cevapları yakalayın",
  description: "Axiom her yapay zeka cevabını doğru bilgiyle karşılaştırır; uydurulan cevapları müşteri görmeden bekletir, düzeltir ya da engeller.",
  icons: { icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath d='M16 3 29 26H3Z' fill='%237B5CFF' opacity='.35'/%3E%3Cpath d='M16 10.5 24.4 25.5H7.6Z' fill='%237B5CFF'/%3E%3Ccircle cx='16' cy='20.5' r='2.6' fill='%23FF6E5A'/%3E%3C/svg%3E" },
};
export const viewport: Viewport = { themeColor: "#08070D" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" translate="no" className="notranslate" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
