from axiom_api.evidence import build_evidence_graph

def test_evidence_graph_marks_numeric_contradiction():
    claims=build_evidence_graph("The recommended dosage is 50 mg twice daily.",[{"id":"guide","content":"The recommended dosage is 5 mg once daily."}])
    assert claims[0].classification=="contradicted"
    assert claims[0].relations[0].relation=="contradicts"

def test_evidence_graph_marks_support():
    claims=build_evidence_graph("Paris is the capital of France.",[{"id":"guide","content":"Paris is the capital city of France."}])
    assert claims[0].classification=="supported"
