"use client";
import Link from "next/link";
import { useState } from "react";
import { api, timeAgo, Trace } from "@/lib/api";
import { label, PROVIDER } from "@/lib/labels";
import { Shell } from "@/components/Shell";
import { Empty, ErrorNote, Loading, PageHead, ScoreCell, Status, useResource } from "@/components/ui";

export default function Reviews() {
  const { data: items, error, reload, setData } = useResource<Trace[]>("/reviews");
  const [busy, setBusy] = useState("");
  const [actionError, setActionError] = useState("");

  async function decide(id: string, decision: "confirm_failure" | "false_positive") {
    setBusy(id); setActionError("");
    try {
      await api(`/requests/${id}/reviews`, { method: "POST", body: JSON.stringify({ decision, reason: decision === "confirm_failure" ? "İnceleme listesinde hata onaylandı" : "İnceleme listesinde yanlış alarm" }) });
      setData(list => (list || []).filter(x => x.id !== id));
    } catch (e) { setActionError(e instanceof Error ? e.message : "Karar kaydedilemedi."); }
    finally { setBusy(""); }
  }

  return (
    <Shell>
      <PageHead eyebrow="İnsan kontrolü" title="İnceleme" actions={<button className="btn btn-line btn-sm" onClick={reload}>↻ Yenile</button>}>
        Şüpheli bulunan cevaplar burada bekler. Her birine karar verin: gerçekten hata mı, yoksa yanlış alarm mı? Karar verilen cevap listeden çıkar.
      </PageHead>
      {actionError && <ErrorNote message={actionError} />}
      {error ? <ErrorNote message={error} retry={reload} /> : !items ? <Loading /> : items.length === 0 ? (
        <Empty title="Bekleyen cevap yok"><p className="muted">Tüm şüpheli cevaplara karar verilmiş. Yeni bir cevap kontrol etmek için <Link className="lnk" href="/check">Yeni kontrol</Link> sayfasına gidin.</p></Empty>
      ) : (
        <div className="stack">
          {[...items].sort((a, b) => (a.reliability?.overall ?? 100) - (b.reliability?.overall ?? 100)).map(x => (
            <section className="card qitem" key={x.id}>
              <Link href={`/requests/${x.id}`} className="qmain">
                <b>{x.prompt_preview || "Soru kaydedilmemiş"}</b>
                <small className="muted">{x.model} · {label(PROVIDER, x.provider)} · {timeAgo(x.created_at)}</small>
              </Link>
              <ScoreCell value={x.reliability?.overall} />
              <Status value={x.status} />
              <div className="qacts">
                <button className="btn btn-ink btn-sm" disabled={busy === x.id} onClick={() => decide(x.id, "confirm_failure")}>Hata</button>
                <button className="btn btn-line btn-sm" disabled={busy === x.id} onClick={() => decide(x.id, "false_positive")}>Yanlış alarm</button>
                <Link className="btn btn-line btn-sm" href={`/requests/${x.id}`}>İncele →</Link>
              </div>
            </section>
          ))}
        </div>
      )}
    </Shell>
  );
}
