"""Run after the API starts. This submits a real, deliberately contradictory trace."""
import json, os, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parents[2]/"packages"/"sdk-python"))
from axiom_sdk import Axiom

client=Axiom(os.getenv("AXIOM_DEMO_API_KEY","ax_demo_local"),os.getenv("AXIOM_API_URL","http://localhost:8000"))
result=client.trace(
    idempotency_key="deterministic-dosage-v1",
    provider="local",model="deterministic-rag",prompt="What is the recommended dosage?",
    response="The recommended dosage is 50 mg twice daily.",
    sources=[{"id":"medical-guide","title":"Dosage guide","content":"The recommended dosage is 5 mg once daily."}],
    citations=[{"source_id":"medical-guide","quote":"The recommended dosage is 5 mg once daily."}],
    metadata={"demo":True},
)
print(json.dumps(result,indent=2))

