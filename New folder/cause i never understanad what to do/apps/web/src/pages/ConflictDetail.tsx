import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { api } from "../lib/api";
import { SeverityBadge, StatusBadge, ConfidenceBadge } from "../components/StatusBadge";

export default function ConflictDetail() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const navigate = useNavigate();
  const [action, setAction] = useState("");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => { if (id) api.conflicts.get(id).then((d) => setData(d)); }, [id]);

  const resolve = async (act: string) => {
    setAction(act);
    await api.conflicts.resolve(id!, { action: act, value: act === "choose" || act === "edit" ? value : undefined, reason });
    navigate("/conflicts");
  };

  if (!data) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-8 w-8" style={{ border: "2px solid var(--border-default)", borderTopColor: "var(--accent)" }} /></div>;

  const { conflict, entity, sources, sourceRecords } = data;

  const sourceMap = new Map(sources.map((s: any) => [s.id, s]));

  return (
    <div className="space-y-6">
      <button className="btn btn-ghost" onClick={() => navigate("/conflicts")}>← Back to Conflicts</button>
      <div className="surface-elevated p-6" style={{ borderRadius: "var(--radius-lg)" }}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-title" style={{ color: "var(--text-primary)" }}>{conflict.fieldName.replace(/_/g, " ")} Conflict</h2>
          <SeverityBadge severity={conflict.severity} />
          <StatusBadge status={conflict.status} />
          <ConfidenceBadge score={conflict.confidence || 0} />
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>Entity: {entity?.displayName}</p>
      </div>

      <div className="surface p-6" style={{ borderRadius: "var(--radius-lg)" }}>
        <h3 className="text-title mb-4" style={{ color: "var(--text-primary)" }}>Values by Source</h3>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Source</th><th>Raw Value</th><th>Normalized</th><th>Updated</th></tr></thead>
            <tbody>
              {(conflict.candidates || []).map((c: any, i: number) => (
                <tr key={i}>
                  <td className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{(c as any).sourceName || (sourceMap.get((c as any).sourceId) as any)?.name || (c as any).sourceId}</td>
                  <td className={`text-sm ${c.rawValue === conflict.recommendedValue || c.normalizedValue === conflict.recommendedValue ? "conflict-cell pick" : "conflict-cell diff"}`}>{c.rawValue}</td>
                  <td className="text-sm" style={{ color: "var(--text-secondary)" }}>{c.normalizedValue}</td>
                  <td className="text-sm" style={{ color: "var(--text-tertiary)" }}>{c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="surface p-6" style={{ borderRadius: "var(--radius-lg)" }}>
        <h3 className="text-title mb-2" style={{ color: "var(--text-primary)" }}>Recommendation</h3>
        <p className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>{conflict.recommendedValue}</p>
        <p className="text-sm mt-2" style={{ color: "var(--text-tertiary)" }}>{conflict.explanation}</p>
      </div>

      <div className="surface p-6" style={{ borderRadius: "var(--radius-lg)" }}>
        <div className="space-y-3">
          <h3 className="text-title" style={{ color: "var(--text-primary)" }}>Resolve</h3>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-ok" onClick={() => resolve("approve")}>Approve</button>
            <button className="btn btn-danger" onClick={() => resolve("reject")}>Reject</button>
            <button className="btn btn-primary" onClick={() => resolve("choose")}>Choose Value</button>
          </div>
          <input className="input" placeholder="Enter custom value" value={value} onChange={(e) => setValue(e.target.value)} />
          <input className="input" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </div>
    </div>
  );
}
