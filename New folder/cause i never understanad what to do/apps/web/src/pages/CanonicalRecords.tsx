import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../lib/api";
import { StatusBadge, ConfidenceBadge } from "../components/StatusBadge";

export default function CanonicalRecords() {
  const [records, setRecords] = useState<any[]>([]);
  const navigate = useNavigate();

  const load = () => api.canonical.list().then((d: any) => setRecords(d.records || []));
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-display" style={{ color: "var(--text-primary)" }}>Canonical Records</h1>
        <p className="text-caption mt-0.5">Master records after reconciliation</p>
      </div>
      <div className="surface" style={{ borderRadius: "var(--radius-lg)" }}>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Entity</th><th>Status</th><th>Confidence</th><th>Updated</th></tr></thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/canonical-records/${r.id}`)}>
                  <td className="font-medium" style={{ color: "var(--text-primary)" }}>{r.displayName}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td><ConfidenceBadge score={r.confidence || 0} /></td>
                  <td className="text-sm" style={{ color: "var(--text-tertiary)" }}>{new Date(r.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {!records.length && <tr><td colSpan={4} className="text-center py-8 text-sm" style={{ color: "var(--text-tertiary)" }}>No canonical records yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
