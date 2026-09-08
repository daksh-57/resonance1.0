import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../lib/api";
import { ConfidenceBadge, StatusBadge } from "../components/StatusBadge";

export default function Duplicates() {
  const [groups, setGroups] = useState<any[]>([]);
  const navigate = useNavigate();

  const load = () => api.duplicates.list().then((d: any) => setGroups(d.groups || []));
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-display" style={{ color: "var(--text-primary)" }}>Duplicates</h1>
        <p className="text-caption mt-0.5">Review matched entity groups</p>
      </div>
      <div className="surface" style={{ borderRadius: "var(--radius-lg)" }}>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Entity</th><th>Status</th><th>Confidence</th><th>Updated</th></tr></thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/entities/${g.id}`)}>
                  <td className="font-medium" style={{ color: "var(--text-primary)" }}>{g.displayName}</td>
                  <td><StatusBadge status={g.status} /></td>
                  <td><ConfidenceBadge score={g.confidence || 0} /></td>
                  <td className="text-sm" style={{ color: "var(--text-tertiary)" }}>{new Date(g.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {!groups.length && <tr><td colSpan={4} className="text-center py-8 text-sm" style={{ color: "var(--text-tertiary)" }}>No duplicate groups found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
