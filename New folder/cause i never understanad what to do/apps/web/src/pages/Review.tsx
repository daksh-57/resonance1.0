import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../lib/api";
import { SeverityBadge, StatusBadge, ConfidenceBadge } from "../components/StatusBadge";

export default function Review() {
  const [tasks, setTasks] = useState<any[]>([]);
  const navigate = useNavigate();

  const load = () => api.review.list().then((d: any) => setTasks(d.tasks || []));
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-display" style={{ color: "var(--text-primary)" }}>Review Queue</h1>
        <p className="text-caption mt-0.5">Conflicts awaiting human review</p>
      </div>
      <div className="space-y-3">
        {tasks.map((t) => (
          <div key={t.id} className="surface-elevated p-5" style={{ borderRadius: "var(--radius-lg)" }}>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-title" style={{ color: "var(--text-primary)" }}>{t.entityName}</h3>
              <SeverityBadge severity={t.conflict?.severity} />
              <StatusBadge status={t.conflict?.status} />
              <ConfidenceBadge score={t.conflict?.confidence || 0} />
            </div>
            <p className="text-sm capitalize mb-1" style={{ color: "var(--text-secondary)" }}>{t.conflict?.fieldName?.replace(/_/g, " ")}</p>
            <p className="text-sm mb-1" style={{ color: "var(--text-tertiary)" }}>Recommended: {t.conflict?.recommendedValue}</p>
            <p className="text-sm mb-3" style={{ color: "var(--text-tertiary)" }}>{t.conflict?.explanation}</p>
            <div className="flex gap-2">
              <button className="btn btn-ok" onClick={() => { api.conflicts.resolve(t.conflict.id, { action: "approve" }); load(); }}>Approve</button>
              <button className="btn btn-danger" onClick={() => { api.conflicts.resolve(t.conflict.id, { action: "reject" }); load(); }}>Reject</button>
              <button className="btn btn-ghost" onClick={() => navigate(`/conflicts/${t.conflict.id}`)}>Review</button>
            </div>
          </div>
        ))}
        {!tasks.length && <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No open review tasks.</p>}
      </div>
    </div>
  );
}
