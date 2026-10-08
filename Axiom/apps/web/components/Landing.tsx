"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Brand, Mark } from "./Mark";
import { Sky } from "./Sky";

/* ---------- header: a floating bubble once the page moves; light glass over light sheets ---------- */
function Header() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const update = () => {
      el.classList.toggle("stuck", window.scrollY > 24);
      const probe = 40;
      const light = [...document.querySelectorAll<HTMLElement>(".sheet")].some(s => { const r = s.getBoundingClientRect(); return r.top <= probe && r.bottom >= probe; });
      el.classList.toggle("light", light);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <header className="hdr" ref={ref}>
      <div className="wrap">
        <Brand />
        <nav className="nav" aria-label="Ana menü">
          <a href="#detect">Nasıl yakalar?</a><a href="#how">Nasıl çalışır?</a><a href="#developers">Geliştiriciler</a><a href="#faq">SSS</a>
        </nav>
        <div className="right">
          <Link className="signin" href="/login">Giriş yap</Link>
          <Link className="btn btn-brand btn-sm" href="/login">Panele git <span className="ar">→</span></Link>
        </div>
      </div>
    </header>
  );
}

/* ---------- reveal on scroll ---------- */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.15 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ---------- live demo: watch Axiom catch a made-up answer ---------- */
type Word = { w: string; risk?: string };
const ANSWERS = {
  madeup: {
    label: "Uydurma bir cevap", hint: "Bu ilacın önerilen dozu nedir?",
    q: "Bu ilacın önerilen dozu nedir?",
    source: "Önerilen doz günde 1 kez 5 mg'dır. Aç ya da tok karnına alınabilir.",
    words: ["Önerilen", "doz", { w: "günde 2 kez", risk: "Kaynakta günde 1 kez yazıyor" }, { w: "50 mg'dır", risk: "Kaynakta 5 mg yazıyor" }, "ve", { w: "yemekle birlikte alınmalıdır.", risk: "Kaynakta böyle bir bilgi yok" }] as (string | Word)[],
    score: 31, finding: "Kaynakla çelişiyor", repaired: "Önerilen doz günde 1 kez 5 mg'dır; aç ya da tok karnına alınabilir.",
    detectors: [["Çelişki", 10], ["Kaynağa dayanma", 38], ["Kaynak gösterme", 100], ["Kişisel veri", 100]] as [string, number][],
  },
  grounded: {
    label: "Doğru bir cevap", hint: "İade param ne zaman yatar?",
    q: "İade param ne zaman yatar?",
    source: "İade tutarı, iade onaylandıktan sonra 14 gün içinde kartınıza yatırılır.",
    words: ["İade", "tutarı,", "iade", "onaylandıktan", "sonra", "14", "gün", "içinde", "kartınıza", "yatırılır."] as (string | Word)[],
    score: 96, finding: "", repaired: "",
    detectors: [["Çelişki", 100], ["Kaynağa dayanma", 94], ["Kaynak gösterme", 100], ["Kişisel veri", 100]] as [string, number][],
  },
};
const POLICIES = {
  hold: { label: "İncelemeye beklet", hint: "Müşteri, bir çalışan onaylayana kadar bekler" },
  repair: { label: "Kaynağa göre düzelt", hint: "Axiom cevabı doğru bilgiyle yeniden yazar" },
  block: { label: "Güvenli cevap gönder", hint: "Müşteri hazır yedek mesajınızı görür" },
  flag: { label: "Gönder ve işaretle", hint: "Cevap gider, puanıyla birlikte listeye düşer" },
};
type AnswerKey = keyof typeof ANSWERS; type PolicyKey = keyof typeof POLICIES;

function Demo() {
  const [answer, setAnswer] = useState<AnswerKey>("madeup");
  const [policy, setPolicy] = useState<PolicyKey>("hold");
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<"idle" | "reading" | "deciding" | "routed" | "repairing">("idle");
  const [run, setRun] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const a = ANSWERS[answer];
  const total = a.words.length;

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !started.current) { started.current = true; setRun(r => r + 1); } }, { threshold: 0.35 });
    io.observe(root.current!);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!run) return;
    const timers: number[] = [];
    setShown(0); setPhase("reading");
    for (let i = 1; i <= total; i++) timers.push(window.setTimeout(() => setShown(i), 140 * i + 250));
    const end = 140 * total + 450;
    timers.push(window.setTimeout(() => setPhase("deciding"), end));
    const flagged = a.score < 70;
    if (flagged && policy === "repair") {
      timers.push(window.setTimeout(() => setPhase("repairing"), end + 700));
      timers.push(window.setTimeout(() => setPhase("routed"), end + 2300));
    } else timers.push(window.setTimeout(() => setPhase("routed"), end + 800));
    return () => timers.forEach(clearTimeout);
  }, [run, answer, policy, total, a.score]);

  const restart = useCallback(() => setRun(r => r + 1), []);
  const words = a.words.slice(0, shown).map(x => typeof x === "string" ? { w: x } : x);
  const riskSeen = words.filter(x => x.risk).length;
  const riskTotal = a.words.filter(x => typeof x !== "string").length;
  const live = phase === "reading" ? Math.round(100 - (100 - a.score) * (riskTotal ? riskSeen / riskTotal : shown / total)) : phase === "idle" ? 100 : a.score;
  const flagged = a.score < 70, done = phase === "routed";
  const tone = live < 50 ? "risk" : live < 70 ? "warn" : "ok";

  let customer: React.ReactNode = <span className="muted">Cevap bekleniyor…</span>, customerTag = "";
  let repairLane: React.ReactNode = "Beklemede", queue: React.ReactNode = "Bekleyen yok";
  if (phase === "repairing") repairLane = <span className="typing">Kaynağa göre yeniden yazılıyor</span>;
  if (done && !flagged) { customer = a.words.map(x => typeof x === "string" ? x : x.w).join(" "); customerTag = `Geçti · ${a.score}`; }
  if (done && flagged) {
    if (policy === "hold") { customer = "Bir dakika, bu cevabı bir uzmanımız kontrol ediyor."; customerTag = "Bekletildi"; queue = <><b>1 bekleyen</b> · {a.finding.toLocaleLowerCase("tr")}</>; }
    if (policy === "repair") { customer = a.repaired; customerTag = "Düzeltildi · 94"; repairLane = <><b>Düzeltildi</b> · 31 → 94</>; queue = <>Kayda alındı · orijinali saklandı</>; }
    if (policy === "block") { customer = "Bu doz bilgisini doğrulayamıyorum. Lütfen prospektüse bakın ya da eczacınıza danışın."; customerTag = "Güvenli cevap"; queue = <><b>Engellendi</b> · {a.finding.toLocaleLowerCase("tr")}</>; }
    if (policy === "flag") { customer = a.words.map(x => typeof x === "string" ? x : x.w).join(" "); customerTag = `Gönderildi · ${a.score}`; queue = <><b>1 işaretli</b> · {a.score} puanla gönderildi</>; }
  }

  return (
    <div className="demo reveal" ref={root}>
      <div className="demo-ctl">
        <fieldset>
          <legend>Bir cevap seçin</legend>
          {(Object.keys(ANSWERS) as AnswerKey[]).map(k => (
            <button key={k} className={`opt ${answer === k ? "on" : ""}`} onClick={() => { setAnswer(k); setRun(r => r + 1); }}>
              <b>{ANSWERS[k].label}</b><small>{ANSWERS[k].hint}</small>
            </button>
          ))}
        </fieldset>
        <fieldset>
          <legend>Axiom yakalarsa ne olsun?</legend>
          {(Object.keys(POLICIES) as PolicyKey[]).map(k => (
            <button key={k} className={`opt ${policy === k ? "on" : ""}`} onClick={() => { setPolicy(k); setRun(r => r + 1); }}>
              <b>{POLICIES[k].label}</b><small>{POLICIES[k].hint}</small>
            </button>
          ))}
        </fieldset>
      </div>
      <div className="demo-run">
        <div className="lane-l">
          <div className="dq"><span className="lbl">Müşteri soruyor</span><p>{a.q}</p></div>
          <div className={`reader ${phase === "reading" ? "busy" : ""}`}>
            <div className="reader-h">
              <span className="lbl"><i /> {phase === "reading" ? "Axiom okuyor" : phase === "idle" ? "Hazır" : flagged ? "Yakalandı" : "Doğrulandı"}</span>
              <span className={`live tone-${tone}`}>{live}</span>
            </div>
            <p className="ans">
              {words.map((x, i) => x.risk
                ? <mark key={i} className="riskword pop" data-tip={x.risk}>{x.w}</mark>
                : <span key={i} className="pop">{x.w} </span>)}
              {phase === "reading" && <i className="caret" />}
            </p>
            <div className="dets">
              {a.detectors.map(([name, v]) => {
                const val = phase === "idle" || phase === "reading" ? Math.round(100 - (100 - v) * (shown / total)) : v;
                return <div key={name}><span>{name}</span><div className="meter"><i className={val < 50 ? "risk" : val < 70 ? "warn" : ""} style={{ width: `${val}%`, animation: "none", transition: "width .3s" }} /></div><b>{val}</b></div>;
              })}
            </div>
            <div className="src"><span className="lbl">Doğru bilgi (kaynak)</span>“{a.source}”</div>
          </div>
        </div>
        <div className="lane-r">
          <div className={`dest ${done ? "on" : ""} ${done && flagged && policy !== "flag" ? "guard" : ""}`}>
            <span className="lbl">Müşterinin gördüğü {customerTag && <em className={`chip ${!flagged ? "ok" : policy === "flag" ? "warn" : policy === "repair" ? "ok" : "brand"}`}>{customerTag}</em>}</span>
            <p>{customer}</p>
          </div>
          <div className={`dest ${phase === "repairing" || (done && flagged && policy === "repair") ? "on" : ""}`}>
            <span className="lbl">Düzeltme</span><p>{repairLane}</p>
          </div>
          <div className={`dest ${done && flagged ? "on risk" : ""}`}>
            <span className="lbl">İnceleme listesi</span><p>{queue}</p>
          </div>
          <button className="btn btn-line btn-sm replay" onClick={restart}>↻ Tekrar oynat</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- the pinned flow: a console that walks through setup as you scroll ---------- */
const STEPS = [
  ["Cevabı gönderin", "Paneldeki forma yapıştırın ya da uygulamanızı bağlayın: soru, yapay zekanın cevabı ve doğru bilgi Axiom'a gelir."],
  ["Axiom okur", "Her cümle kaynakla karşılaştırılır. Uydurulan sayılar, çelişen bilgiler ve kişisel veriler kelime kelime işaretlenir."],
  ["Kuralınız karar verir", "Siz belirlersiniz: düşük puanlı cevap bekletilsin mi, düzeltilsin mi, engellensin mi?"],
  ["Ekibiniz son sözü söyler", "Şüpheli cevaplar inceleme listesine düşer. \"Hata\" ya da \"yanlış alarm\" kararı tek tıkla verilir."],
];
const TABS = ["Gönder", "Oku", "Karar", "İncele"];

function Flow() {
  const section = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [pinned, setPinned] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 980px)");
    let timer = 0;
    const onScroll = () => {
      const r = section.current!.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / (r.height - window.innerHeight)));
      setProgress(p); setActive(Math.min(3, Math.floor(p * 4)));
    };
    const setup = () => {
      window.removeEventListener("scroll", onScroll); clearInterval(timer);
      setPinned(mq.matches);
      if (mq.matches) { window.addEventListener("scroll", onScroll, { passive: true }); onScroll(); }
      else timer = window.setInterval(() => setActive(a => (a + 1) % 4), 4200);
    };
    setup(); mq.addEventListener("change", setup);
    return () => { window.removeEventListener("scroll", onScroll); clearInterval(timer); mq.removeEventListener("change", setup); };
  }, []);
  const jump = (i: number) => {
    if (!pinned) { setActive(i); return; }
    const el = section.current!; const top = el.offsetTop + (el.offsetHeight - window.innerHeight) * ((i + 0.5) / 4);
    window.scrollTo({ top, behavior: "smooth" });
  };
  const tilt = [{ ry: -9, rx: 5 }, { ry: -5, rx: 3 }, { ry: -11, rx: 6 }, { ry: -4, rx: 2 }][active];

  return (
    <section className={`flow ${pinned ? "" : "flat"}`} ref={section} id="how">
      <div className="pin">
        <div className="wrap flow-grid">
          <div>
            <p className="eyebrow light">Nasıl çalışır?</p>
            <h2 className="flow-h">Cevabı gönderin, gerisini Axiom halletsin.</h2>
            <ol className="steps" style={{ ["--p" as string]: pinned ? progress : (active + 1) / 4 }}>
              <span className="bar" />
              {STEPS.map(([t, d], i) => (
                <li key={t} className={i === active ? "on" : ""} onClick={() => jump(i)}>
                  <div className="st-h"><span className="n">0{i + 1}</span>{t}</div><p>{d}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="stack3d">
            <div className="tilt" style={{ ["--ry" as string]: `${tilt.ry}deg`, ["--rx" as string]: `${tilt.rx}deg` }}>
              <div className="plate" /><div className="plate" /><div className="plate" />
              <div className="app">
                <div className="app-bar">
                  <span className="mk"><Mark size={20} /> Axiom</span>
                  <div className="tabs">{TABS.map((t, i) => <button key={t} className={i === active ? "on" : ""} onClick={() => jump(i)}>{t}</button>)}</div>
                  <span className="meta">müşteri asistanı · canlı</span>
                </div>
                <div className="screens">
                  <Screen on={active === 0}><Terminal on={active === 0} /></Screen>
                  <Screen on={active === 1}><DetectScreen on={active === 1} /></Screen>
                  <Screen on={active === 2}><DecideScreen on={active === 2} /></Screen>
                  <Screen on={active === 3}><ReviewScreen on={active === 3} /></Screen>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
function Screen({ on, children }: { on: boolean; children: React.ReactNode }) { return <div className={`scr ${on ? "on" : ""}`} aria-hidden={!on}>{children}</div>; }

function useTicker(on: boolean, count: number, every = 380) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) { setN(0); return; }
    setN(0); const id = window.setInterval(() => setN(x => { if (x >= count) { clearInterval(id); return x; } return x + 1; }), every);
    return () => clearInterval(id);
  }, [on, count, every]);
  return n;
}

const TERM: [string, string][] = [
  ["c", "pip install -e packages/sdk-python"], ["ok", "✔ Installed axiom-sdk 0.1.0"], ["c", "export AXIOM_API_KEY=ax_••••••••••"], ["", " "],
  ["dim", "# app.py"], ["", "from axiom_sdk import Axiom"], ["", "axiom = Axiom(api_key=os.environ[\"AXIOM_API_KEY\"])"], ["", "result = axiom.trace(model=\"gemini\", prompt=q,"], ["", "                     response=answer, sources=docs)"], ["", " "],
  ["hl", "{\"reliability\": {\"overall\": 31}, \"policy\": {\"action\": \"HOLD\"}}"],
];
function Terminal({ on }: { on: boolean }) {
  const n = useTicker(on, TERM.length, 260);
  return (
    <div className="term">
      <pre>{TERM.map(([c, t], i) => <span key={i} className={`ln ${c} ${i < n ? "on" : ""}`}>{t}{"\n"}</span>)}</pre>
      <div className="facts">
        <div><b>Anında</b>Cevap saniyeler içinde kontrol edilir</div>
        <div><b>Açıklamalı</b>Her işaretin nedeni Türkçe yazılır</div>
        <div><b>Güvenli</b>Anahtarlar sunucuda saklanır</div>
      </div>
    </div>
  );
}
function DetectScreen({ on }: { on: boolean }) {
  const n = useTicker(on, 5, 320);
  const rows: [string, number, string][] = [["çelişki", 10, "50 mg ≠ kaynaktaki 5 mg"], ["kaynağa dayanma", 38, "2 cümle kaynakta yok"], ["kaynak gösterme", 100, "Tüm kaynaklar mevcut"], ["kişisel veri", 100, "Hassas bilgi yok"]];
  return (
    <div className="pane">
      <div className="pane-h"><b>Müşteri sorusu · Gemini</b><span>0,8 sn</span></div>
      <p className="ans big">Önerilen doz <mark className="riskword">günde 2 kez 50 mg</mark>&apos;dır ve yemekle alınmalıdır.</p>
      <div className="det-grid">
        <div className={`ring ${n >= 5 ? "risk" : ""}`} style={{ ["--v" as string]: n >= 5 ? 31 : n * 20 }}><b>{n >= 5 ? 31 : "…"}</b></div>
        <ul className="det-list">
          {rows.map(([d, v, why], i) => (
            <li key={d} className={i < n ? "on" : ""}>
              <span>{d}</span><div className="meter"><i className={v < 50 ? "risk" : ""} style={{ width: i < n ? `${v}%` : 0, animation: "none", transition: "width .6s var(--ease)" }} /></div><b className={v < 50 ? "tone-risk" : ""}>{v}</b><small>{why}</small>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
function DecideScreen({ on }: { on: boolean }) {
  const n = useTicker(on, 4, 520);
  const rules = [["güven puanı", "<", "20", "ENGELLE"], ["çelişki puanı", "<", "30", "BEKLET"], ["dayanak puanı", "<", "60", "DÜZELT"], ["güven puanı", "<", "70", "İŞARETLE"]];
  return (
    <div className="pane">
      <div className="pane-h"><b>Sağlık cevapları · sürüm 3</b><span>yukarıdan aşağıya okunur</span></div>
      <ul className="rules">
        {rules.map(([m, op, v, act], i) => (
          <li key={i} className={`${i < n ? "seen" : ""} ${i === 1 && n >= 2 ? "hit" : ""} ${i > 1 && n >= 2 ? "skip" : ""}`}>
            <code>{m} {op} {v}</code><span className="arrow">→</span><em className={`chip ${act === "ENGELLE" ? "risk" : act === "BEKLET" ? "brand" : "warn"}`}>{act}</em>
            {i === 1 && n >= 2 && <small>uydu · çelişki puanı = 10</small>}
          </li>
        ))}
      </ul>
      <div className={`verdict ${n >= 3 ? "on" : ""}`}><b>BEKLET</b> Müşteriye bekleme mesajı gider, cevap bir çalışanın onayını bekler.</div>
    </div>
  );
}
function ReviewScreen({ on }: { on: boolean }) {
  const n = useTicker(on, 3, 900);
  const rows = [["Önerilen doz günde 2 kez 50 mg'dır…", "Kaynakla çelişiyor", 31], ["Siparişiniz Berlin deposundan gönderilir…", "Kaynakta yok", 44], ["İade için ayse@ornek.com adresine yazın…", "Kişisel veri", 52]];
  return (
    <div className="pane">
      <div className="pane-h"><b>İnceleme listesi</b><span>{Math.max(0, 3 - (n >= 2 ? 1 : 0))} bekleyen</span></div>
      <ul className="queue">
        {rows.map(([t, why, s], i) => (
          <li key={i} className={i === 0 && n >= 2 ? "done" : ""}>
            <span className="sc tone-risk">{s}</span><span className="q">{t}</span><em className="chip risk">{why}</em>
            {i === 0 && <span className={`acts ${n >= 1 ? "focus" : ""}`}>{n >= 2 ? <em className="chip ok">Hata onaylandı · kayda alındı</em> : <><button className="btn btn-ink btn-sm">Evet, hata</button><button className="btn btn-line btn-sm">Yanlış alarm</button></>}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- developers: code tabs ---------- */
const CODE = {
  Python: `from axiom_sdk import Axiom

axiom = Axiom(api_key="ax_demo_local")
result = axiom.trace(
    provider="gemini", model="gemini-3.8-flash",
    prompt="Bu ilacın önerilen dozu nedir?",
    response=answer,
    sources=[{"id": "prospektus", "content": prospektus_metni}],
)
if result["policy"]["action"] != "PASS":
    answer = fallback  # bekletildi, düzeltildi ya da engellendi`,
  JavaScript: `import { Axiom } from "@axiom/sdk";

const axiom = new Axiom({ apiKey: process.env.AXIOM_API_KEY! });
const result = await axiom.generate({
  provider: "gemini",
  prompt,
  sources,
});

result.reliability.overall; // 31
result.policy.action;       // "HOLD"`,
  cURL: `curl -X POST http://localhost:8000/v1/traces \\
  -H "Authorization: Bearer ax_demo_local" \\
  -H "Idempotency-Key: dosage-demo-1" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"deterministic-rag",
       "prompt":"Bu ilacın önerilen dozu nedir?",
       "response":"Önerilen doz günde 2 kez 50 mg.",
       "sources":[{"id":"source-1",
         "content":"Önerilen doz günde 1 kez 5 mg."}]}'`,
};
function Code() {
  const [tab, setTab] = useState<keyof typeof CODE>("Python");
  const [copied, setCopied] = useState(false);
  return (
    <div className="code reveal">
      <div className="code-bar">
        <div className="tabs dark">{(Object.keys(CODE) as (keyof typeof CODE)[]).map(k => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{k}</button>)}</div>
        <button className="copy" onClick={() => { navigator.clipboard?.writeText(CODE[tab]).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }).catch(() => {}); }}>{copied ? "Kopyalandı" : "Kopyala"}</button>
      </div>
      <pre key={tab}><code>{CODE[tab]}</code></pre>
    </div>
  );
}

const FAQ = [
  ["Axiom bir cevabın uydurma olduğunu nasıl anlıyor?", "Her cevap, yanında gönderdiğiniz doğru bilgiyle (kaynakla) karşılaştırılır. Cümlelerin kaynakta geçip geçmediğine, sayıların ve miktarların kaynakla uyuşup uyuşmadığına bakılır; varsa kişisel veriler ve kaynak gösterimleri de kontrol edilir. Sonuç 100 üzerinden tek bir güven puanı ve işaretlenmiş kelimelerdir."],
  ["Kesin sonuç mu veriyor?", "Hayır, bir ön kontroldür. Kontroller kelime ve sayı karşılaştırmasına dayanır, bu yüzden her işaretin nedeni açıkça görülebilir ve tekrarlanabilir. Son kararı ekibiniz tek tıkla verir."],
  ["Şüpheli bir cevap yakalanınca ne oluyor?", "Ne olacağına Kurallar sayfasından siz karar verirsiniz: geçir, işaretle, beklet, düzelt ya da engelle. Düzeltmede orijinal cevap her zaman saklanır."],
  ["Kod bilmem gerekiyor mu?", "Hayır. Panelde Yeni kontrol sayfasına soruyu, cevabı ve doğru bilgiyi yapıştırmanız yeterli. Uygulamanızı otomatik bağlamak isterseniz hazır Python ve JavaScript kütüphaneleri var."],
  ["Yapay zeka anahtarım güvende mi?", "Evet. Gemini anahtarı yalnızca sunucuda okunur, tarayıcıya hiç gönderilmez. Uygulama anahtarları şifrelenmiş olarak saklanır ve yalnızca oluşturulduğunda bir kez gösterilir."],
];

export function Landing() {
  useReveal();
  return (
    <div className="landing">
      <Header />
      <section className="hero">
        <Sky />
        <div className="wrap hero-in">
          <h1 className="hero-h">Yapay zekanın <em>uydurduğu</em> cevapları yakalayın.</h1>
          <div className="hero-side">
            <p className="lede">Axiom, yapay zekanın her cevabını doğru bilgiyle karşılaştırır. Uydurulan sayıları, çelişen bilgileri ve dayanaksız iddiaları müşteri görmeden yakalar; bekletir, düzeltir ya da engeller.</p>
            <div className="ctas">
              <Link className="btn btn-brand" href="/login">Ücretsiz dene <span className="ar">→</span></Link>
              <a className="btn btn-ghost" href="#detect">Canlı izle</a>
            </div>
            <p className="hint"><span className="dot" /> İmleci gezdirin: her nokta bir cevap, kırmızılar uydurma.</p>
          </div>
        </div>
      </section>

      <section className="sheet" id="detect">
        <div className="wrap sec">
          <div className="sh reveal">
            <h2>Axiom uydurma bir cevabı nasıl yakalar?</h2>
            <p>Yapay zeka cevabı yazarken Axiom her ifadeyi doğru bilgiyle karşılaştırır. Cevap bittiğinde, sizin belirlediğiniz kurala göre yönlendirilir. Bir cevap ve bir kural seçip izleyin.</p>
          </div>
          <Demo />
        </div>

        <div className="wrap sec layers">
          <div className="sh reveal">
            <h2>Yapay zekanız ile müşteriniz arasında bir kontrol noktası.</h2>
            <p>Raporlar size dün neyin yanlış gittiğini söyler. Axiom ise cevap müşteriye gitmeden önce devreye girer; yanlış cevap hiç çıkmaz.</p>
          </div>
          <div className="lay-grid">
            <div className="lay-card reveal">
              <div className="viz pipe">
                <div className="pl io">Soru + doğru bilgi</div>
                <div className="pl ax"><Mark size={18} /> Axiom kontrolü<span className="scan" /></div>
                <div className="pl pol">Sizin kuralınız</div>
                <div className="pl io">Doğru cevap ya da güvenli mesaj</div>
              </div>
              <h3>Cevap çıkmadan devreye girer</h3>
              <p>Beş ayrı kontrol her cevabı okur, ardından sizin kuralınız karar verir. Karar verilmeden hiçbir şey müşteriye ulaşmaz.</p>
            </div>
            <div className="lay-card reveal">
              <div className="viz why">
                <span className="chip risk"><i /> Bekletildi · kaynakla çelişiyor</span>
                <p className="mini-l">En riskli cümle</p>
                <p>Önerilen doz <mark className="riskword">günde 2 kez 50 mg</mark>&apos;dır.</p>
                <p className="mini-l">Kaynakta yazan</p>
                <p className="src-q">“Önerilen doz <b>günde 1 kez 5 mg</b>&apos;dır.”</p>
              </div>
              <h3>Nedenini gösterir</h3>
              <p>Her işaret, sorunlu kelimeyi ve çeliştiği bilgiyi gösterir. Ekibiniz nereye bakacağını hemen bilir.</p>
            </div>
            <div className="lay-card reveal">
              <div className="viz agent">
                {[["siparis_ara", "ok"], ["musteri_oku", "ok"], ["iade_yap", "risk"], ["hesap_sil", "risk"]].map(([t, s], i) => (
                  <div key={t} className={`tc ${s}`} style={{ animationDelay: `${i * 0.5}s` }}><code>{t}()</code><em className={`chip ${s}`}>{s === "ok" ? "izinli" : i === 2 ? "onaysız" : "izinsiz"}</em></div>
                ))}
              </div>
              <h3>Yapay zeka ajanlarını da izler</h3>
              <p>Kendi başına işlem yapan ajanlar izinsiz ya da onaysız bir işlem yapmaya kalkarsa durdurulur ve nedeni açıklanır.</p>
            </div>
          </div>
        </div>
      </section>

      <Flow />

      <section className="sheet" id="developers">
        <div className="wrap sec dev">
          <div className="reveal">
            <p className="eyebrow">Geliştiriciler için</p>
            <h2>Uygulamanıza tek satırla bağlayın.</h2>
            <p>Cevabı kaynaklarıyla birlikte gönderin; güven puanını, şüpheli kelimeleri ve ne yapılması gerektiğini aynı anda geri alın.</p>
            <ul className="ticks">
              <li>Python ve JavaScript kütüphaneleri ya da düz HTTP</li>
              <li>Gemini ile cevap üretme ve otomatik düzeltme</li>
              <li>Kod yazmadan, panelden elle kontrol</li>
              <li>Aynı soruyu farklı modellerle karşılaştırma</li>
            </ul>
          </div>
          <Code />
        </div>

        <div className="wrap sec faq" id="faq">
          <div className="sh reveal"><h2>Sık sorulan sorular</h2><p>Kısacası: her işaretin nedeni açıktır, her karar kayıt altındadır ve müşteriniz yalnızca kontrolden geçen cevabı görür.</p></div>
          <div className="faq-list reveal">
            {FAQ.map(([q, a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>

      <section className="closing">
        <Sky density={0.45} lensLabel={false} />
        <div className="wrap">
          <h2>Hataları müşterinizden önce siz görün.</h2>
          <p>Demo hesapla panele girin, ilk cevabınızı bir dakikadan kısa sürede kontrol edin.</p>
          <div className="ctas center">
            <Link className="btn btn-brand" href="/login">Hemen dene <span className="ar">→</span></Link>
            <a className="btn btn-ghost" href="#how">Nasıl çalışır?</a>
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap foot-in">
          <Brand />
          <p>Yapay zeka cevapları için güven katmanı.</p>
          <nav><a href="#detect">Nasıl yakalar?</a><a href="#how">Nasıl çalışır?</a><a href="#developers">Geliştiriciler</a><Link href="/login">Panel</Link></nav>
          <small>© 2026 Axiom</small>
        </div>
      </footer>
    </div>
  );
}
