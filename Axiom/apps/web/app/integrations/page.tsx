"use client";
import { Shell } from "@/components/Shell";
import { ErrorNote, Loading, PageHead, useResource } from "@/components/ui";

type Integration = { name: string; available: boolean; model?: string; description: string };

export default function Integrations() {
  const { data: items, error, reload } = useResource<Integration[]>("/integrations");
  return (
    <Shell>
      <PageHead eyebrow="Bağlantılar" title="Bağlantılar">Axiom&apos;un kullanabildiği modeller ve uygulamanızı bağlama yolları. Model anahtarları yalnızca sunucuda tutulur, tarayıcıya hiç gönderilmez.</PageHead>
      {error ? <ErrorNote message={error} retry={reload} /> : !items ? <Loading rows={2} height={120} /> : (
        <div className="grid2">
          {items.map(x => (
            <section className="card integ" key={x.name}>
              <div className="card-h"><h2>{x.name}</h2><span className={`chip ${x.available ? "ok" : "warn"}`}><i />{x.available ? "hazır" : "bağlı değil"}</span></div>
              <p className="muted">{x.description}</p>
              {x.model && <code className="model">{x.model}</code>}
              {!x.available && x.name === "Gemini" && <p className="muted" style={{ fontSize: 13 }}>Bağlamak için proje klasöründeki <code>.env.local</code> dosyasına <code>GEMINI_API_KEY=...</code> satırını ekleyip sunucuyu yeniden başlatın.</p>}
            </section>
          ))}
        </div>
      )}
    </Shell>
  );
}
