import asyncio, time
from dataclasses import dataclass, field
from typing import Any, Protocol
import httpx
from .config import settings

class ProviderError(RuntimeError):
    def __init__(self, code: str, message: str, status_code: int = 502):
        super().__init__(message)
        self.code, self.status_code = code, status_code

@dataclass
class Generation:
    text: str
    provider: str
    model: str
    latency_ms: int
    input_tokens: int | None = None
    output_tokens: int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

class ModelProvider(Protocol):
    async def generate(self, prompt: str, *, system_prompt: str | None = None, model: str | None = None, response_schema: dict[str, Any] | None = None) -> Generation: ...

BUSY = {429, 500, 502, 503, 504}

class GeminiProvider:
    name = "gemini"
    def __init__(self, api_key: str | None = None, base_url: str = "https://generativelanguage.googleapis.com/v1beta", client: httpx.AsyncClient | None = None):
        self.api_key = api_key if api_key is not None else settings.gemini_api_key
        self.base_url = base_url.rstrip("/")
        self.client = client

    async def generate(self, prompt: str, *, system_prompt: str | None = None, model: str | None = None, response_schema: dict[str, Any] | None = None) -> Generation:
        if not self.api_key:
            raise ProviderError("PROVIDER_NOT_CONFIGURED", "Gemini bağlı değil. .env.local dosyasına GEMINI_API_KEY ekleyip API'yi yeniden başlatın.", 503)
        # An explicitly requested model is used alone; otherwise an overloaded default falls back to a steadier model.
        models = [model] if model else list(dict.fromkeys(m.strip() for m in [settings.gemini_model, *settings.gemini_fallback_model.split(",")] if m.strip()))
        payload: dict[str, Any] = {"contents": [{"role": "user", "parts": [{"text": prompt}]}]}
        if system_prompt:
            payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}
        if response_schema:
            payload["generationConfig"] = {"responseMimeType": "application/json", "responseJsonSchema": response_schema}
        started = time.perf_counter()
        owns_client = self.client is None
        client = self.client or httpx.AsyncClient(timeout=httpx.Timeout(settings.gemini_timeout_seconds, connect=10))
        # One overall budget for the whole fallback chain, so a slow or overloaded Gemini can never hold a request open
        # longer than the web proxy waits.
        deadline = started + settings.gemini_total_timeout_seconds
        remaining = lambda: deadline - time.perf_counter()
        try:
            response, selected = None, models[0]
            for index, selected in enumerate(models):
                last_model = index == len(models) - 1
                if remaining() < 3: break
                try:
                    for attempt in range(2):
                        response = await client.post(f"{self.base_url}/models/{selected}:generateContent", headers={"x-goog-api-key": self.api_key}, json=payload, timeout=httpx.Timeout(min(settings.gemini_timeout_seconds, max(remaining(), 1)), connect=10))
                        if response.status_code not in BUSY or attempt == 1 or remaining() < 5: break
                        await asyncio.sleep(.6 * (attempt + 1))
                except httpx.TimeoutException:
                    response = None
                    if last_model: break
                    continue
                if response.status_code in BUSY and not last_model: continue
                break
            if response is None: raise ProviderError("PROVIDER_TIMEOUT", "Gemini zamanında cevap vermedi. Birkaç dakika sonra tekrar deneyin ya da Demo modelini kullanın.", 504)
            if response.is_error:
                if response.status_code in BUSY: raise ProviderError("GEMINI_BUSY", "Gemini şu an çok yoğun. Birkaç dakika sonra tekrar deneyin ya da Demo modelini kullanın.", 503)
                try: detail = response.json().get("error", {}).get("message", "Gemini isteği başarısız oldu.")
                except ValueError: detail = "Gemini isteği başarısız oldu."
                raise ProviderError("GEMINI_API_ERROR", f"Gemini isteği reddetti: {detail}", 502)
            body = response.json()
            candidates = body.get("candidates") or []
            parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
            text = "".join(part.get("text", "") for part in parts)
            if not text:
                reason = candidates[0].get("finishReason") if candidates else body.get("promptFeedback", {}).get("blockReason")
                raise ProviderError("GEMINI_EMPTY_RESPONSE", f"Gemini metin döndürmedi ({reason or 'bilinmeyen sebep'}).")
            usage = body.get("usageMetadata", {})
            return Generation(text=text, provider=self.name, model=selected, latency_ms=round((time.perf_counter()-started)*1000), input_tokens=usage.get("promptTokenCount"), output_tokens=usage.get("candidatesTokenCount"), metadata={"finish_reason": candidates[0].get("finishReason"), "usage_metadata": usage})
        except httpx.TimeoutException as exc:
            raise ProviderError("PROVIDER_TIMEOUT", "Gemini zamanında cevap vermedi.", 504) from exc
        except httpx.RequestError as exc:
            raise ProviderError("PROVIDER_UNAVAILABLE", "Gemini'ye ulaşılamadı.", 502) from exc
        finally:
            if owns_client: await client.aclose()

class DeterministicProvider:
    """Credential-free adapter for examples and boundary tests only."""
    async def generate(self, prompt: str, **_: Any) -> Generation:
        lowered = prompt.lower()
        if "dosage" in lowered: text = "The recommended dosage is 50 mg twice daily."
        elif "doz" in lowered: text = "Önerilen doz günde 2 kez 50 mg'dır."
        elif "iade" in lowered: text = "İade tutarı 30 gün içinde hesabınıza yatırılır."
        else: text = "Bu soru için hazır bir demo cevabı yok; gerçek bir cevap için Gemini'yi kullanın."
        return Generation(text=text, provider="local", model="deterministic-rag", latency_ms=0)

def get_provider(name: str) -> ModelProvider:
    if name == "gemini": return GeminiProvider()
    if name == "local": return DeterministicProvider()
    raise ProviderError("PROVIDER_NOT_FOUND", f"'{name}' sağlayıcısı kullanılamıyor.", 404)
