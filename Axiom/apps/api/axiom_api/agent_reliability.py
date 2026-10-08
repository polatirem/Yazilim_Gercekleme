from typing import Any
from jsonschema import Draft202012Validator

def inspect_tool_calls(steps: list[dict[str, Any]], allowed_tools: dict[str, dict[str, Any]], confirmation_required: list[str]) -> list[dict[str, Any]]:
    findings=[]
    for step_index,step in enumerate(steps):
        for call_index,call in enumerate(step.get("tool_calls",[])):
            tool=call["tool"]; base={"step":step_index,"call":call_index,"tool":tool}
            if tool not in allowed_tools:
                findings.append({**base,"type":"unauthorized_tool","severity":"critical","reason":"Bu araç izin verilen araçlar listesinde yok."}); continue
            errors=list(Draft202012Validator(allowed_tools[tool]).iter_errors(call.get("arguments",{})))
            if errors: findings.append({**base,"type":"invalid_arguments","severity":"high","reason":"; ".join(e.message for e in errors)})
            if tool in confirmation_required and not call.get("confirmed",False): findings.append({**base,"type":"missing_confirmation","severity":"critical","reason":"Geri alınamaz bu işlem için açık onay gerekiyordu."})
            if call.get("status")=="failed": findings.append({**base,"type":"failed_tool","severity":"high","reason":"Araç çalışırken hata verdi."})
    return findings
