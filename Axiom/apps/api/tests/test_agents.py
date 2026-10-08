from axiom_api.agent_reliability import inspect_tool_calls

SCHEMA={"cancel_booking":{"type":"object","required":["booking_id"],"properties":{"booking_id":{"type":"string"}}}}
def test_tool_allowlist_schema_and_confirmation():
    findings=inspect_tool_calls([{"tool_calls":[{"tool":"cancel_booking","arguments":{},"confirmed":False},{"tool":"steal_data","arguments":{}}]}],SCHEMA,["cancel_booking"])
    assert {x["type"] for x in findings}=={"invalid_arguments","missing_confirmation","unauthorized_tool"}

def test_valid_tool_call():
    assert inspect_tool_calls([{"tool_calls":[{"tool":"cancel_booking","arguments":{"booking_id":"b1"},"confirmed":True}]}],SCHEMA,["cancel_booking"])==[]
