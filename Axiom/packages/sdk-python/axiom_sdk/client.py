import httpx

class AxiomError(RuntimeError):
    pass

class Axiom:
    def __init__(self, api_key: str, base_url: str = "http://localhost:8000"):
        self.api_key, self.base_url = api_key, base_url.rstrip("/")

    def _post(self, path: str, payload: dict, idempotency_key: str | None = None):
        headers={"Authorization":f"Bearer {self.api_key}"}
        if idempotency_key: headers["Idempotency-Key"]=idempotency_key
        response=httpx.post(f"{self.base_url}{path}",json=payload,headers=headers,timeout=90)
        if response.is_error:
            try: message=response.json()["error"]["message"]
            except Exception: message=response.text
            raise AxiomError(message)
        return response.json()

    def trace(self, *, idempotency_key: str | None = None, **trace):
        return self._post("/v1/traces",trace,idempotency_key)

    def generate(self, *, idempotency_key: str | None = None, **request):
        return self._post("/v1/generate",request,idempotency_key)

    def agent_run(self, **run):
        return self._post("/v1/agent-runs",run)
