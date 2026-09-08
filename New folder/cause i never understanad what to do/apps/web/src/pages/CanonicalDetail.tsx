import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { api } from "../lib/api";

export default function CanonicalDetail() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => { if (id) api.canonical.get(id).then((d) => setData(d)); }, [id]);

  if (!data) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-8 w-8" style={{ border: "2px solid var(--border-default)", borderTopColor: "var(--accent)" }} /></div>;

  const { record, fields, entity, sources } = data;

  return (
    <div className="space-y-4">
      <button className="btn btn-ghost" onClick={() => navigate("/canonical-records")}>← Back</button>
      <div className="surface-elevated p-6" style={{ borderRadius: "var(--radius-lg)" }}>
        <h2 className="text-title" style={{ color: "var(--text-primary)" }}>{entity?.displayName}</h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>Status: {record.status} • Confidence: {Math.round((record.confidence || 0) * 100)}%</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((f: any) => (
          <div key={f.id} className="surface p-4" style={{ borderRadius: "var(--radius-lg)" }}>
            <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>{f.fieldName.replace(/_/g, " ")}</div>
            <div className="text-sm font-medium mt-1" style={{ color: "var(--text-primary)" }}>{f.value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Confidence: {Math.round((f.confidence || 0) * 100)}%</div>
            {f.evidence && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer" style={{ color: "var(--accent)" }}>Evidence</summary>
                <pre className="text-xs p-2 rounded mt-2 overflow-x-auto" style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}>{JSON.stringify(f.evidence, null, 2)}</pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
