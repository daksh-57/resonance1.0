import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Audit() {
  const [events, setEvents] = useState<any[]>([]);
  const [action, setAction] = useState("");

  const load = () => api.audit.list({ action }).then((d: any) => setEvents(d.events || []));
  useEffect(() => { load(); }, [action]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display" style={{ color: "var(--text-primary)" }}>Audit Trail</h1>
          <p className="text-caption mt-0.5">Track all system activities</p>
        </div>
        <input className="input" style={{ maxWidth: "16rem" }} placeholder="Filter by action..." value={action} onChange={(e) => setAction(e.target.value)} />
      </div>
      <div className="surface" style={{ borderRadius: "var(--radius-lg)" }}>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Action</th><th>Entity</th><th>Actor</th><th>Time</th></tr></thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i}>
                  <td className="text-sm capitalize" style={{ color: "var(--text-secondary)" }}>{e.action.replace(/_/g, " ")}</td>
                  <td className="text-sm" style={{ color: "var(--text-secondary)" }}>{e.entityType}</td>
                  <td className="text-sm" style={{ color: "var(--text-tertiary)" }}>{e.actorUserId?.slice(0, 8)}</td>
                  <td className="text-sm" style={{ color: "var(--text-tertiary)" }}>{new Date(e.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {!events.length && <tr><td colSpan={4} className="text-center py-8 text-sm" style={{ color: "var(--text-tertiary)" }}>No audit events.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
