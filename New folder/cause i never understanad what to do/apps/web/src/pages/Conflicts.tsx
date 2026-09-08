import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../lib/api";
import { SeverityBadge, StatusBadge, ConfidenceBadge } from "../components/StatusBadge";
import { Pagination } from "../components/Pagination";

export default function Conflicts() {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const load = () => api.conflicts.list({ page, pageSize: 25, status }).then((d: any) => { setItems(d.conflicts || []); setTotal(d.total || 0); });
  useEffect(() => { load(); }, [page, status]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display" style={{ color: "var(--text-primary)" }}>Conflicts</h1>
          <p className="text-caption mt-0.5">Review and resolve data conflicts</p>
        </div>
        <select className="input" style={{ maxWidth: "14rem" }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="pending_review">Pending Review</option>
          <option value="auto_resolved">Auto Resolved</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="overridden">Overridden</option>
        </select>
      </div>
      <div className="surface" style={{ borderRadius: "var(--radius-lg)" }}>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Field</th><th>Entity</th><th>Severity</th><th>Confidence</th><th>Status</th><th>Recommended</th></tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="cursor-pointer" style={{ cursor: "pointer" }} onClick={() => navigate(`/conflicts/${c.id}`)}>
                  <td className="font-medium capitalize" style={{ color: "var(--text-primary)" }}>{c.fieldName.replace(/_/g, " ")}</td>
                  <td className="text-sm" style={{ color: "var(--text-secondary)" }}>{c.entityName}</td>
                  <td><SeverityBadge severity={c.severity} /></td>
                  <td><ConfidenceBadge score={c.confidence || 0} /></td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="text-sm" style={{ color: "var(--text-secondary)" }}>{c.recommendedValue}</td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan={6} className="text-center py-8 text-sm" style={{ color: "var(--text-tertiary)" }}>No conflicts found.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={25} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
