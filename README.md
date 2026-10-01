# Yazılım Gerçekleme — Çoklu Platform Proje Ekosistemi

Bu depo, **Yazılım Gerçekleme** dersi kapsamında geliştirilen projeleri ve dokümantasyonunu barındırmaktadır. Projenin kavramsal temelleri, bilişsel arka planı ve ayrıntılı mimari analizi için **[idea.md](idea.md)** dokümanını inceleyebilirsiniz.

---

## 📁 Proje Yapısı

```
.
├── idea.md                  # Proje analizi, vizyonu ve gerçekleme dokümanı
├── sidequest/               # Next.js 16 + React 19 + TypeScript (Web İstemcisi)
├── mobile/                  # Expo SDK 57 + React Native (Mobil İstemci)
└── PIS/                     # ASP.NET Core 8 MVC (Proje Bilgi ve Yönetim Sistemi)
```

---

## 🌟 Projeler

### 1. Sidequest (Web Platformu) — `/sidequest`
Ekran süresini azaltıp kullanıcıyı gerçek dünyada bilişsel görevlere yönlendiren gerçek dünya keşif oyunu.
- **Teknolojiler:** Next.js 16 (App Router), React 19, TypeScript, Zod, Vitest, Playwright, özel CSS token sistemi.
- **İçerik:** 4 kampanya, 28 özgün görev, 16 bilişsel fenomen keşfi (Kodeks), dinamik gece haritası (Şehir), Bağlam Motoru.
- **Detaylı Bilgi:** [sidequest/README.md](sidequest/README.md) ve [docs/](sidequest/docs/).

### 2. Sidequest Mobile — `/mobile`
Sidequest platformunun sahada ve açık havada kullanımını sağlayan mobil uygulaması.
- **Teknolojiler:** React Native 0.86, Expo SDK 57, Expo Font (IBM Plex Sans, Instrument Serif), React 19.
- **Özellikler:** Web ile senkronize görev akışı, mobil-first ergonomi, bildirim ve jest kontrolleri.

### 3. Proje Bilgi Sistemi (PIS) — `/PIS`
Yazılım tasarımı ve modelleme aşamasında kurgulanan kurumsal ve idari takip sistemi.
- **Teknolojiler:** .NET 8.0, ASP.NET Core MVC, Entity Framework Core, SQLite, ASP.NET Core Identity.
- **Özellikler:** Katmanlı mimari (Repository-Service-Controller), rol bazlı yetkilendirme, idari yönetim alanı (`Areas/Admin`), proje ve kategori yönetimi.
- **Detaylı Bilgi:** [PIS/project-information-system/Readme.md](PIS/project-information-system/Readme.md).

---

## 🚀 Hızlı Başlangıç

### Web (Sidequest)
```bash
cd sidequest
npm install
npm run dev
```

### Mobil
```bash
cd mobile
npm install
npx expo start
```

### PIS (Backend/MVC)
```bash
cd PIS/project-information-system
dotnet restore
dotnet run
```

---

## 📄 Detaylı Fikir Dokümanı
Projenin bilişsel bilim boyutu, görev durum makinesi, güvenlik motoru ve metodolojisi için **[idea.md](idea.md)** dosyasını okuyunuz.
