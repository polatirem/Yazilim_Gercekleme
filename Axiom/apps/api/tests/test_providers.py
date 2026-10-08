import httpx, pytest
from axiom_api.providers import GeminiProvider, ProviderError

@pytest.mark.asyncio
async def test_gemini_provider_parses_text_and_usage():
    def handler(request):
        assert request.headers["x-goog-api-key"] == "secret"
        assert request.url.path.endswith("/models/test-model:generateContent")
        return httpx.Response(200,json={"candidates":[{"content":{"parts":[{"text":"Grounded answer"}]},"finishReason":"STOP"}],"usageMetadata":{"promptTokenCount":5,"candidatesTokenCount":2}})
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        result=await GeminiProvider("secret",client=client).generate("question",model="test-model")
    assert result.text=="Grounded answer" and result.input_tokens==5 and result.output_tokens==2

@pytest.mark.asyncio
async def test_gemini_provider_falls_back_when_default_model_is_busy(monkeypatch):
    from axiom_api import providers
    monkeypatch.setattr(providers.settings,"gemini_model","busy-model"); monkeypatch.setattr(providers.settings,"gemini_fallback_model","steady-model")
    calls=[]
    def handler(request):
        calls.append(request.url.path)
        if "busy-model" in request.url.path: return httpx.Response(503,json={"error":{"message":"high demand"}})
        return httpx.Response(200,json={"candidates":[{"content":{"parts":[{"text":"Cevap"}]},"finishReason":"STOP"}]})
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        result=await GeminiProvider("secret",client=client).generate("soru")
    assert result.text=="Cevap" and result.model=="steady-model" and any("busy-model" in c for c in calls)

@pytest.mark.asyncio
async def test_gemini_provider_requires_key():
    with pytest.raises(ProviderError) as error:
        await GeminiProvider("").generate("question")
    assert error.value.code=="PROVIDER_NOT_CONFIGURED"
