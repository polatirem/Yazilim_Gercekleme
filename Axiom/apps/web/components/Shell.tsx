"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, clearToken, token } from "@/lib/api";
import { Brand } from "./Mark";

const I = {
  requests: <path d="M3 4h14M3 10h14M3 16h9" />,
  review: <><path d="M10 2.5 17 6v4.5c0 4-3 6.3-7 7.5-4-1.2-7-3.5-7-7.5V6Z" /><path d="m7 10 2 2 4-4" /></>,
  policy: <><path d="M4 3h12v14H4z" /><path d="M7 7h6M7 10h6M7 13h3" /></>,
  agents: <><circle cx="10" cy="5" r="2.5" /><circle cx="4.5" cy="15" r="2.5" /><circle cx="15.5" cy="15" r="2.5" /><path d="m8.8 7.2-3 5.5M11.2 7.2l3 5.5M7 15h6" /></>,
  replay: <><path d="M3.5 10a6.5 6.5 0 1 0 2-4.7" /><path d="M3 2.5v3.5h3.5" /><path d="m9 7.5 3.5 2.5L9 12.5Z" /></>,
  plug: <><path d="M7 2v4M13 2v4M5 6h10v3a5 5 0 0 1-10 0Z" /><path d="M10 14v4" /></>,
  docs: <><path d="M5 2.5h7l3.5 3.5v11.5H5Z" /><path d="M12 2.5V6h3.5M8 10h5M8 13h5" /></>,
};
const NAV: [string, string, keyof typeof I][] = [["/dashboard", "Kontroller", "requests"], ["/documents", "Belgeler", "docs"], ["/reviews", "İnceleme", "review"], ["/policies", "Kurallar", "policy"], ["/agents", "Ajan işlemleri", "agents"], ["/replays", "Model karşılaştırma", "replay"], ["/integrations", "Bağlantılar", "plug"]];

function Icon({ name }: { name: keyof typeof I }) {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[name]}</svg>;
}

type Me = { email: string; organization: { name: string } };

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(), router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [waiting, setWaiting] = useState(0);
  const [apiUp, setApiUp] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!token()) return;
    api<Me>("/me").then(setMe).catch(() => setApiUp(false));
    api<unknown[]>("/reviews").then(x => setWaiting(x.length)).catch(() => {});
  }, [path]);
  useEffect(() => setOpen(false), [path]);

  const logout = () => { clearToken(); router.push("/login"); };
  const active = (href: string) => path === href || (href === "/dashboard" && path.startsWith("/requests"));

  return (
    <div className="shell">
      <div className="mtop"><Brand href="/dashboard" /><button aria-label="Menü" aria-expanded={open} onClick={() => setOpen(o => !o)}>{open ? "✕" : "☰"}</button></div>
      <aside className={`rail ${open ? "open" : ""}`}>
        <Brand href="/dashboard" />
        <Link href="/check" className={`newcheck ${path === "/check" ? "on" : ""}`}><span>+</span> Yeni kontrol</Link>
        <span className="grp">Genel</span>
        {NAV.slice(0, 4).map(([href, label, icon]) => (
          <Link key={href} href={href} className={`item ${active(href) ? "on" : ""}`}><Icon name={icon} />{label}{href === "/reviews" && waiting > 0 && <span className="count">{waiting}</span>}</Link>
        ))}
        <span className="grp">Gelişmiş</span>
        {NAV.slice(4).map(([href, label, icon]) => <Link key={href} href={href} className={`item ${active(href) ? "on" : ""}`}><Icon name={icon} />{label}</Link>)}
        <div className="foot">
          <span className={`status-dot ${apiUp ? "" : "down"}`}><i />{apiUp ? "Sunucu bağlı" : "Sunucuya ulaşılamıyor"}</span>
          <div className="who"><b>{me?.email?.[0]?.toUpperCase() || "·"}</b><span>{me?.organization.name || "Yükleniyor…"}<small>{me?.email || ""}</small></span></div>
          <button className="out" onClick={logout}>Çıkış yap →</button>
        </div>
      </aside>
      <div className="stage"><main className="sheet">{children}</main></div>
    </div>
  );
}
