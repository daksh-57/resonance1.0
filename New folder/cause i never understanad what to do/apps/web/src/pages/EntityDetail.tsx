import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { api } from "../lib/api";
import { StatusBadge, ConfidenceBadge, SeverityBadge } from "../components/StatusBadge";

type Tab = "sources" | "conflicts" | "canonical" | "audit";

export default function EntityDetail() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("sources");
  const navigate = useNavigate();

  useEffect(() => { if (id) api.entities.get(id).then((d) => setData(d)); }, [id]);

  if (!data) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-8 w-8" style={{ border: "2px solid var(--border-default)", borderTopColor: "var(--accent)" }} /></div>;

  const { entity, matches, sourceRecords, conflicts, canonical, canonicalFields, audit, sources } = data;
  const sourceMap = new Map(sources.map((s: any) => [s.id, s]));

  return (
    <div className="space-y-6">
      <button className="btn btn-ghost" onClick={() => navigate("/entities")}>← Back to Entities</button>
      <div className="surface-elevated p-6" style={{ borderRadius: "var(--radius-lg)" }}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-title" style={{ color: "var(--text-primary)" }}>{entity.displayName}</h2>
          <StatusBadge status={entity.status} />
          <ConfidenceBadge score={entity.confidence || 0} />
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>{entity.primaryEmail} • {entity.primaryPhone}</p>
        <div className="flex gap-4 mt-3 text-sm" style={{ color: "var(--text-tertiary)" }}>
          <span>Sources: {sourceRecords.length}</span>
          <span>Conflicts: {conflicts.length}</span>
          <span>Matches: {matches.length}</span>
        </div>
      </div>

      <div className="flex gap-1" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        {([
          { key: "sources", label: "Source Records" },
          { key: "conflicts", label: `Conflicts (${conflicts.length})` },
          { key: "canonical", label: "Canonical" },
          { key: "audit", label: "Audit" },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className="px-4 py-2 text-sm font-medium transition-colors" style={{ borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent", color: tab === t.key ? "var(--accent)" : "var(--text-tertiary)" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "sources" && (
        <div className="surface p-6" style={{ borderRadius: "var(--radius-lg)" }}>
          {sourceRecords.length === 0 ? <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No source records.</p> : (
            <div className="space-y-3">
              {sourceRecords.map((r: any) => (
                <div key={r.id} className="p-3" style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{(sourceMap.get(r.sourceId) as any)?.name || r.sourceId}</div>
                  <pre className="text-xs p-2 rounded mt-2 overflow-x-auto" style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}>{JSON.stringify(r.raw?.mapped || r.raw, null, 2)}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "conflicts" && (
        <div className="surface p-6" style={{ borderRadius: "var(--radius-lg)" }}>
          {conflicts.length === 0 ? <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No conflicts.</p> : (
            <div className="space-y-2">
              {conflicts.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3" style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                  <div>
                    <div className="text-sm font-medium capitalize" style={{ color: "var(--text-primary)" }}>{c.fieldName.replace(/_/g, " ")}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{c.recommendedValue}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={c.severity} />
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "canonical" && (
        <div className="surface p-6" style={{ borderRadius: "var(--radius-lg)" }}>
          {!canonical ? <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No canonical record yet.</p> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {canonicalFields.map((f: any) => (
                <div key={f.id} className="p-3" style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                  <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>{f.fieldName.replace(/_/g, " ")}</div>
                  <div className="text-sm font-medium mt-1" style={{ color: "var(--text-primary)" }}>{f.value}</div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Confidence: {Math.round((f.confidence || 0) * 100)}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "audit" && (
        <div className="surface p-6" style={{ borderRadius: "var(--radius-lg)" }}>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Action</th><th>Entity</th><th>Time</th></tr></thead>
              <tbody>
                {audit.slice(0, 20).map((a: any, i: number) => (
                  <tr key={i}>
                    <td className="text-sm capitalize" style={{ color: "var(--text-secondary)" }}>{a.action.replace(/_/g, " ")}</td>
                    <td className="text-sm" style={{ color: "var(--text-tertiary)" }}>{a.entityType}</td>
                    <td className="text-sm" style={{ color: "var(--text-tertiary)" }}>{new Date(a.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
