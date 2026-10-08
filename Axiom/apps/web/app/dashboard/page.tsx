"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api, scoreTone, timeAgo, Trace } from "@/lib/api";
import { label, PROVIDER } from "@/lib/labels";
import { Shell } from "@/components/Shell";
import { ErrorNote, Loading, PageHead, ScoreCell, Status, useResource } from "@/components/ui";

type Page = { items: Trace[]; next_cursor: string | null };
const FILTERS = { all: "Tümü", attention: "Dikkat gerekenler", passed: "Güvenli" } as const;
type Filter = keyof typeof FILTERS;
const SAFE = new Set(["passed", "cleared"]);

export default function Dashboard() {
  const { data, error, reload, setData } = useResource<Page>("/requests?limit=50");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [more, setMore] = useState(false);
  const items = data?.items;

  const stats = useMemo(() => {
    const list = items || [];
    const scored = list.filter(x => x.reliability);
    const attention = list.filter(x => !SAFE.has(x.status));
    const mean = scored.length ? Math.round(scored.reduce((n, x) => n + x.reliability!.overall, 0) / scored.length) : null;
    const buckets = Array.from({ length: 10 }, (_, i) => scored.filter(x => Math.min(9, Math.floor(x.reliability!.overall / 10)) === i).length);
    const caught = attention.filter(x => x.status !== "confirmed").sort((a, b) => (a.reliability?.overall ?? 100) - (b.reliability?.overall ?? 100)).slice(0, 4);
    return { total: list.length, attention: attention.length, mean, buckets, caught, stopped: list.filter(x => ["hold", "block", "confirmed"].includes(x.status)).length };
  }, [items]);

  const rows = useMemo(() => (items || []).filter(x =>
    (filter === "all" || (filter === "passed" ? SAFE.has(x.status) : !SAFE.has(x.status))) &&
    (!query || `${x.prompt_preview || ""} ${x.model} ${x.provider}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")))), [items, filter, query]);

  async function loadMore() {
    if (!data?.next_cursor) return;
    setMore(true);
    try { const next = await api<Page>(`/requests?limit=50&cursor=${encodeURIComponent(data.next_cursor)}`); setData({ items: [...data.items, ...next.items], next_cursor: next.next_cursor }); }
    catch { /* keep the loaded page; the button stays available to retry */ }
    finally { setMore(false); }
  }

  const maxBucket = Math.max(1, ...stats.buckets);
  return (
    <Shell>
      <PageHead eyebrow="Genel bakış" title="Kontroller" actions={<><button className="btn btn-line btn-sm" onClick={reload}>↻ Yenile</button><Link className="btn btn-brand btn-sm" href="/check">+ Yeni kontrol</Link></>}>
        Kontrol edilen tüm yapay zeka cevapları. Puan, cevabın verilen kaynaklarla ne kadar uyuştuğunu gösterir.
      </PageHead>

      {error ? <ErrorNote message={error} retry={reload} /> : !items ? <Loading rows={4} height={92} /> : items.length === 0 ? (
        <div className="card welcome">
          <div>
            <p className="eyebrow">Başlayalım</p>
            <h2>İlk kontrolünüzü yapın</h2>
            <p className="muted">Bir soru, yapay zekanın cevabı ve doğru bilgiyi içeren kaynağı girin. Axiom uydurulan kısımları saniyeler içinde işaretler.</p>
            <Link className="btn btn-brand" href="/check">Cevap kontrol et <span className="ar">→</span></Link>
          </div>
          <ol className="how3">
            <li><b>1</b><span><strong>Soruyu ve cevabı girin</strong>Chatbot&apos;unuzun cevabını yapıştırın ya da yapay zekaya ürettirin.</span></li>
            <li><b>2</b><span><strong>Doğru bilgiyi ekleyin</strong>Ürün sayfası, politika, prospektüs… cevabın dayanması gereken metin.</span></li>
            <li><b>3</b><span><strong>Sonucu görün</strong>Uydurulan sayılar ve desteksiz cümleler tek tek işaretlenir.</span></li>
          </ol>
        </div>
      ) : (
        <>
          <section className="kpis">
            <div className="card kpi"><small>Toplam kontrol</small><strong>{stats.total}</strong><div className="sub">son kontroller</div></div>
            <div className={`card kpi ${stats.attention ? "hot" : ""}`}><small>Dikkat gereken</small><strong className={stats.attention ? "tone-risk" : "tone-ok"}>{stats.attention}</strong><div className="sub">kontrollerin %{stats.total ? Math.round((stats.attention / stats.total) * 100) : 0}&apos;i</div></div>
            <div className="card kpi"><small>Ortalama güven puanı</small><strong className={`tone-${scoreTone(stats.mean)}`}>{stats.mean ?? "—"}</strong><div className="sub">100 üzerinden</div></div>
            <div className="card kpi"><small>Durdurulan cevap</small><strong>{stats.stopped}</strong><div className="sub">bekletilen, engellenen ya da onaylanan hata</div></div>
          </section>

          <section className="dash-grid">
            <div className="card">
              <div className="card-h"><h2>Puan dağılımı</h2><span>kaç cevap hangi puanı aldı</span></div>
              <div className="hist">
                {stats.buckets.map((n, i) => (
                  <div key={i} className="hb" title={`${i * 10}–${i * 10 + 9} puan: ${n} cevap`}>
                    <i className={i < 5 ? "risk" : i < 7 ? "warn" : ""} style={{ height: `${Math.max(n ? 8 : 2, (n / maxBucket) * 100)}%`, animationDelay: `${i * 40}ms` }} />
                    <small>{i * 10}</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-h"><h2>Son yakalananlar</h2><Link href="/reviews" className="lnk">İncelemeye git →</Link></div>
              {stats.caught.length === 0 ? <p className="muted">Bekleyen şüpheli cevap yok.</p> : (
                <ul className="catches">
                  {stats.caught.map(x => (
                    <li key={x.id}><Link href={`/requests/${x.id}`}>
                      <span className={`sc tone-${scoreTone(x.reliability?.overall)}`}>{x.reliability?.overall ?? "—"}</span>
                      <span className="t"><b>{x.prompt_preview || x.model}</b><small>{label(PROVIDER, x.provider)} · {timeAgo(x.created_at)}</small></span>
                      <Status value={x.status} />
                    </Link></li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <div className="toolbar">
            <div className="seg">{(Object.keys(FILTERS) as Filter[]).map(k => <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{FILTERS[k]}</button>)}</div>
            <input className="input search" placeholder="Soru ya da model ara" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <section className="card tbl">
            <div className="tr th"><span>Soru</span><span>Zaman</span><span>Durum</span><span>Güven puanı</span><span /></div>
            {rows.map(x => (
              <Link className="tr" href={`/requests/${x.id}`} key={x.id}>
                <span><b>{x.prompt_preview || "Soru kaydedilmemiş"}</b><small>{x.model} · {label(PROVIDER, x.provider)}</small></span>
                <span className="muted" title={new Date(x.created_at).toLocaleString("tr-TR")}>{timeAgo(x.created_at)}</span>
                <span><Status value={x.status} /></span>
                <ScoreCell value={x.reliability?.overall} />
                <span className="go">→</span>
              </Link>
            ))}
            {rows.length === 0 && <p className="muted" style={{ padding: "18px 20px", margin: 0 }}>Bu filtreye uyan kontrol yok.</p>}
          </section>
          {data?.next_cursor && <div className="more"><button className="btn btn-line btn-sm" disabled={more} onClick={loadMore}>{more ? "Yükleniyor…" : "Daha fazla göster"}</button></div>}
        </>
      )}
    </Shell>
  );
}
