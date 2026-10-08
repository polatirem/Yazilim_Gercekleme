// Plain-Turkish names for everything the API reports with technical codes.
export const STATUS: Record<string, string> = {
  passed: "Güvenli", pass: "Güvenli", flagged: "Şüpheli", hold: "Bekletildi", block: "Engellendi", review: "İncelemede",
  repair: "Düzeltilecek", retry: "Tekrar denenecek", route: "Yönlendirildi", abstain: "Cevapsız bırakıldı",
  confirmed: "Hata onaylandı", cleared: "Sorun yok", failed: "Başarısız", completed: "Tamamlandı", queued: "Sırada", running: "Çalışıyor",
};
export const DETECTOR: Record<string, { name: string; about: string }> = {
  grounding: { name: "Kaynağa dayanma", about: "Cevaptaki her cümle verdiğiniz kaynaklarda geçiyor mu?" },
  contradiction: { name: "Çelişki", about: "Cevaptaki sayılar ve miktarlar kaynakla uyuşuyor mu?" },
  citation: { name: "Kaynak gösterme", about: "Cevabın gösterdiği kaynaklar gerçekten var mı?" },
  schema: { name: "Format", about: "Cevap beklenen formatta mı?" },
  pii: { name: "Kişisel veri", about: "Cevapta e-posta ya da kart numarası gibi bilgiler var mı?" },
  semantic: { name: "Anlam kontrolü", about: "Yapay zeka, yalnızca bulunan belge bölümlerine bakarak her ifadenin doğru olup olmadığını değerlendirir." },
  coverage: { name: "Belge kapsamı", about: "Yüklenen belgelerde bu soruyla ilgili bir bölüm var mı?" },
};
export const ACTION: Record<string, string> = {
  PASS: "Geçir", FLAG: "İşaretle", HOLD: "Beklet", REPAIR: "Düzelt", RETRY: "Tekrar dene", ROUTE: "Yönlendir",
  BLOCK: "Engelle", ABSTAIN: "Cevap verme", REVIEW: "İncelemeye gönder",
};
export const CLAIM: Record<string, string> = { supported: "Destekleniyor", uncertain: "Belirsiz", contradicted: "Çelişiyor", unsupported: "Desteklenmiyor" };
export const RELATION: Record<string, string> = { supports: "destekliyor", weak_support: "kısmen destekliyor", contradicts: "çelişiyor", unrelated: "ilgisiz" };
export const DECISION: Record<string, string> = {
  confirm_failure: "Hata onaylandı", false_positive: "Yanlış alarm", approve: "Onaylandı", reject: "Reddedildi", correct: "Düzeltildi", escalate: "Üst incelemeye gönderildi",
};
export const AGENT_FINDING: Record<string, string> = {
  unauthorized_tool: "İzinsiz araç", invalid_arguments: "Hatalı parametre", missing_confirmation: "Onaysız işlem", failed_tool: "Araç hatası",
};
export const PROVIDER: Record<string, string> = { manual: "Elle girildi", local: "Demo modeli", gemini: "Gemini", unknown: "Bilinmiyor" };

export const label = (map: Record<string, string>, key: string | undefined | null) => (key ? map[key] ?? map[key.toLowerCase()] ?? key : "—");

/** One-line, non-technical verdict for a reliability score. */
export function verdict(score: number | null | undefined) {
  if (score == null) return { title: "Puanlanmadı", text: "Bu cevap için puan hesaplanamadı." };
  if (score >= 70) return { title: "Güvenilir görünüyor", text: "Cevaptaki bilgiler verdiğiniz kaynaklarla uyuşuyor." };
  if (score >= 50) return { title: "Şüpheli", text: "Cevabın bir kısmı kaynaklarla uyuşmuyor. Gözden geçirilmeli." };
  return { title: "Büyük ihtimalle uydurma", text: "Cevap kaynaklarla çelişiyor ya da kaynaklarda olmayan bilgiler içeriyor." };
}

export const DOC_KIND: Record<string, string> = { pdf: "PDF", docx: "Word", txt: "Metin", md: "Markdown", csv: "CSV", html: "Web sayfası", text: "Yapıştırılan metin" };
