import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../lib/api";

type SearchResult = { kind: string; id: string; label: string; sub?: string };

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        navigate("/search");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const data: any = await api.search(q);
      const out: SearchResult[] = [];
      for (const r of data?.entities || []) out.push({ kind: "Entity", id: r.id, label: r.displayName, sub: r.status });
      for (const r of data?.conflicts || []) out.push({ kind: "Conflict", id: r.id, label: `${r.fieldName} — ${r.entityName}`, sub: r.status });
      for (const r of data?.sources || []) out.push({ kind: "Source", id: r.id, label: r.name, sub: r.type });
      setResults(out);
    }, 200);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-display" style={{ color: "var(--text-primary)" }}>Search</h1>
        <p className="text-caption mt-0.5">Find entities, conflicts, and sources</p>
      </div>
      <input
        className="input w-full"
        placeholder="Search entities, conflicts, sources..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />
      <div className="surface" style={{ borderRadius: "var(--radius-lg)" }}>
        {results.length === 0 && q.trim() && <p className="text-sm p-4" style={{ color: "var(--text-tertiary)" }}>No results found.</p>}
        {results.map((r) => (
          <div key={`${r.kind}-${r.id}`} className="flex items-center justify-between p-3 cursor-pointer transition-colors" style={{ borderBottom: "1px solid var(--border-subtle)" }} onClick={() => {
            if (r.kind === "Entity") navigate(`/entities/${r.id}`);
            else if (r.kind === "Conflict") navigate(`/conflicts/${r.id}`);
            else if (r.kind === "Source") navigate("/sources");
          }}>
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{r.label}</div>
              <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{r.sub}</div>
            </div>
            <span className="badge" style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}>{r.kind}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
