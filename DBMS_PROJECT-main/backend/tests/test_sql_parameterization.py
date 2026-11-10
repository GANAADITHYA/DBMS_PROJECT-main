import ast
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1] / "app" / "repositories"
DB_ROOT = Path(__file__).resolve().parents[1] / "app" / "db"


def _sql_execute_calls(path: Path) -> list[ast.Call]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    calls = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            if node.func.attr in {"execute"}:
                calls.append(node)
    return calls


def test_repository_sql_uses_placeholders():
    files = list(REPO_ROOT.glob("*.py")) + list(DB_ROOT.glob("*.py"))
    execute_count = 0
    for path in files:
        if path.name == "__init__.py":
            continue
        source = path.read_text(encoding="utf-8")
        assert "execute(f\"SELECT" not in source
        for call in _sql_execute_calls(path):
            execute_count += 1
            if not call.args:
                continue
            first = call.args[0]
            if isinstance(first, ast.Constant) and isinstance(first.value, str):
                sql = first.value
                if "WHERE" in sql.upper() or "VALUES" in sql.upper() or "set_config" in sql:
                    assert "%s" in sql
    assert execute_count > 0


def test_register_event_calls_database_procedure():
    source = (DB_ROOT / "procedures.py").read_text(encoding="utf-8")
    assert "CALL public.register_event(" in source
    assert "CALL public.close_event(" in source
    assert "FROM public.trace_root_causes(%s, %s)" in source
    assert "FROM public.trace_blast_radius(%s, %s)" in source
    assert "FROM public.blast_radius_impact_summary(%s, %s)" in source
