"use client";
import "./login.css";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login, setToken, token } from "@/lib/api";
import { Brand } from "@/components/Mark";
import { Sky } from "@/components/Sky";

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => { if (token()) router.replace("/dashboard"); }, [router]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setBusy(true);
    const data = new FormData(e.currentTarget);
    try {
      const body = await login(String(data.get("email") || ""), String(data.get("password") || ""));
      if (!body?.access_token) throw new Error("Sunucu oturum anahtarı döndürmedi.");
      setToken(body.access_token);
      router.replace("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Giriş yapılamadı.");
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <section className="login-sky">
        <Sky density={0.8} />
        <div className="login-top"><Brand /></div>
        <div className="login-copy">
          <h2>Her cevap, doğru bilgiyle karşılaştırılır.</h2>
          <div className="catch">
            <span className="chip risk"><i /> Yakalandı · kaynakla çelişiyor</span>
            <p>Önerilen doz <mark className="riskword">günde 2 kez 50 mg</mark>&apos;dır.</p>
            <small>Prospektüs · “Önerilen doz <b>günde 1 kez 5 mg</b>&apos;dır.”</small>
          </div>
        </div>
      </section>
      <section className="login-form">
        <form className="form" onSubmit={submit} noValidate>
          <div>
            <p className="eyebrow">Axiom paneli</p>
            <h1>Tekrar hoş geldiniz.</h1>
            <p className="muted">Yakalanan cevapları görmek ve yeni cevaplar kontrol etmek için giriş yapın.</p>
          </div>
          <label className="field"><span>E-posta</span>
            <input className="input" name="email" type="email" defaultValue="demo@example.com" autoComplete="email" required />
          </label>
          <label className="field"><span>Şifre</span>
            <div className="pw">
              <input className="input" name="password" type={show ? "text" : "password"} defaultValue="demo-password" autoComplete="current-password" required minLength={8} />
              <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}>{show ? "Gizle" : "Göster"}</button>
            </div>
          </label>
          {error && <div className="alert" role="alert"><div>{error}</div></div>}
          <button className="btn btn-brand btn-block" disabled={busy}>{busy ? <><span className="spin" /> Giriş yapılıyor…</> : <>Giriş yap <span className="ar">→</span></>}</button>
          <p className="demo-note">Demo hesap bilgileri hazır doldurulmuştur: <code>demo@example.com</code> / <code>demo-password</code></p>
          <Link className="back" href="/">← Siteye dön</Link>
        </form>
      </section>
    </div>
  );
}
