import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../lib/api";
import { StatusBadge, ConfidenceBadge } from "../components/StatusBadge";
import { Pagination } from "../components/Pagination";

export default function Entities() {
  const [entities, setEntities] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const load = () => api.entities.list({ page, pageSize: 25, q }).then((d: any) => { setEntities(d.entities || []); setTotal(d.total || 0); });
  useEffect(() => { load(); }, [page, q]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display" style={{ color: "var(--text-primary)" }}>Entities</h1>
          <p className="text-caption mt-0.5">Search and inspect matched entities</p>
        </div>
        <input className="input" style={{ maxWidth: "16rem" }} placeholder="Search entities..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>
      <div className="surface" style={{ borderRadius: "var(--radius-lg)" }}>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Name</th><th>Status</th><th>Confidence</th><th>Updated</th></tr></thead>
            <tbody>
              {entities.map((e) => (
                <tr key={e.id} className="cursor-pointer" style={{ cursor: "pointer" }} onClick={() => navigate(`/entities/${e.id}`)}>
                  <td className="font-medium" style={{ color: "var(--text-primary)" }}>{e.displayName}</td>
                  <td><StatusBadge status={e.status} /></td>
                  <td><ConfidenceBadge score={e.confidence || 0} /></td>
                  <td className="text-sm" style={{ color: "var(--text-tertiary)" }}>{new Date(e.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {!entities.length && <tr><td colSpan={4} className="text-center py-8 text-sm" style={{ color: "var(--text-tertiary)" }}>No entities found. Upload data to detect entities.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={25} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
