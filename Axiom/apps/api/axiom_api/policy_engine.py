from dataclasses import dataclass
from typing import Any, Literal
from pydantic import BaseModel, Field, model_validator

Action = Literal["PASS","FLAG","HOLD","REPAIR","RETRY","ROUTE","BLOCK","ABSTAIN","REVIEW"]
Operator = Literal["lt","lte","eq","gte","gt"]

class Condition(BaseModel):
    metric: str = Field(pattern=r"^(reliability|schema|citation|grounding|contradiction|pii)$")
    operator: Operator
    value: float = Field(ge=0, le=100)

class PolicyRule(BaseModel):
    conditions: list[Condition] = Field(min_length=1, max_length=20)
    action: Action
    reason: str = Field(min_length=1, max_length=500)

class PolicyDefinition(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    rules: list[PolicyRule] = Field(min_length=1, max_length=50)

@dataclass
class Decision:
    action: str
    reason: str
    matched_rule: dict[str, Any]

OPS={"lt":lambda a,b:a<b,"lte":lambda a,b:a<=b,"eq":lambda a,b:a==b,"gte":lambda a,b:a>=b,"gt":lambda a,b:a>b}

def evaluate(rules: list[dict[str, Any]], overall: int, dimensions: dict[str, int], fallback: str="PASS") -> Decision:
    metrics={"reliability":overall,**dimensions}
    for raw in rules:
        rule=PolicyRule.model_validate(raw)
        if all(condition.metric in metrics and OPS[condition.operator](metrics[condition.metric],condition.value) for condition in rule.conditions):
            return Decision(rule.action,rule.reason,rule.model_dump())
    return Decision(fallback,"Eşleşen kural yok; varsayılan karar uygulandı (70 altı işaretlenir).",{})
