from axiom_api.policy_engine import evaluate

def test_policy_actions_and_fallback():
    rules=[{"conditions":[{"metric":"reliability","operator":"gte","value":90}],"action":"PASS","reason":"high score"},{"conditions":[{"metric":"grounding","operator":"lt","value":70}],"action":"REPAIR","reason":"weak grounding"}]
    assert evaluate(rules,95,{"grounding":90}).action=="PASS"
    assert evaluate(rules,80,{"grounding":40}).action=="REPAIR"
    assert evaluate(rules,80,{} ,"REVIEW").action=="REVIEW"

def test_critical_policy_equivalent_blocks():
    rules=[{"conditions":[{"metric":"pii","operator":"lt","value":20}],"action":"BLOCK","reason":"PII exposure"}]
    assert evaluate(rules,50,{"pii":10}).action=="BLOCK"
