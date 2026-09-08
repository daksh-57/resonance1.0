import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../lib/api";
import { StatusBadge } from "../components/StatusBadge";
import { EmptyState } from "../components/EmptyState";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#0f766e", "#115e59", "#b45309", "#be123c", "#64748b"];

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.dashboard().then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-8 w-8" style={{ border: "2px solid var(--border-default)", borderTopColor: "var(--accent)" }} /></div>;

  const totals = data?.totals || {};
  const charts = data?.charts || {};
  const activity = data?.activity || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display" style={{ color: "var(--text-primary)" }}>Dashboard</h1>
        <p className="text-caption mt-1">Overview of your reconciliation workspace</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Sources", value: totals.sources ?? 0, to: "/sources" },
          { label: "Datasets", value: totals.datasets ?? 0, to: "/datasets" },
          { label: "Total Records", value: totals.records ?? 0 },
          { label: "Entities", value: totals.entities ?? 0, to: "/entities" },
          { label: "Duplicate Groups", value: totals.duplicates ?? 0, to: "/duplicates" },
          { label: "Open Conflicts", value: totals.conflicts ?? 0, to: "/conflicts" },
          { label: "Needs Review", value: totals.needsReview ?? 0, to: "/review" },
          { label: "Resolution Rate", value: `${Math.round((totals.resolutionRate ?? 0) * 100)}%` },
        ].map((s) => (
          <div
            key={s.label}
            className="surface p-4 cursor-pointer transition-all hover:translate-y-[-1px]"
            style={{ borderRadius: "var(--radius-lg)" }}
            onClick={() => (s as any).to && navigate((s as any).to)}
          >
            <div className="text-caption">{s.label}</div>
            <div className="text-title mt-1" style={{ color: "var(--text-primary)" }}>{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="surface p-5 lg:col-span-2" style={{ borderRadius: "var(--radius-lg)" }}>
          <h3 className="text-title mb-4" style={{ color: "var(--text-primary)" }}>Records by Source</h3>
          {(charts.recordsBySource || []).length === 0 ? (
            <EmptyState title="No data yet" message="Upload a dataset to see source breakdown." />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={charts.recordsBySource}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="source" tick={{ fontSize: 12, fill: "var(--text-tertiary)" }} />
                <YAxis tick={{ fontSize: 12, fill: "var(--text-tertiary)" }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="surface p-5" style={{ borderRadius: "var(--radius-lg)" }}>
          <h3 className="text-title mb-4" style={{ color: "var(--text-primary)" }}>Conflicts by Severity</h3>
          {(charts.severity || []).length === 0 ? (
            <EmptyState title="No conflicts" message="Conflicts will appear here after processing." />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={charts.severity} dataKey="n" nameKey="severity" cx="50%" cy="50%" outerRadius={80} label>
                  {(charts.severity || []).map((entry: any, index: number) => (
                    <Cell key={entry.severity} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="surface p-5 lg:col-span-2" style={{ borderRadius: "var(--radius-lg)" }}>
          <h3 className="text-title mb-4" style={{ color: "var(--text-primary)" }}>Recent Activity</h3>
          {activity.length === 0 ? (
            <EmptyState title="No activity" message="Upload a dataset to get started." />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Action</th><th>Entity</th><th>Time</th></tr></thead>
                <tbody>
                  {activity.slice(0, 10).map((a: any, i: number) => (
                    <tr key={i}>
                      <td className="text-sm capitalize" style={{ color: "var(--text-secondary)" }}>{a.action.replace(/_/g, " ")}</td>
                      <td className="text-sm" style={{ color: "var(--text-tertiary)" }}>{a.entityType}</td>
                      <td className="text-sm" style={{ color: "var(--text-tertiary)" }}>{new Date(a.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="surface p-5" style={{ borderRadius: "var(--radius-lg)" }}>
          <h3 className="text-title mb-4" style={{ color: "var(--text-primary)" }}>Resolution</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span style={{ color: "var(--text-tertiary)" }}>Resolution Rate</span><span className="font-semibold" style={{ color: "var(--text-primary)" }}>{Math.round((totals.resolutionRate ?? 0) * 100)}%</span></div>
            <div className="flex justify-between text-sm"><span style={{ color: "var(--text-tertiary)" }}>Auto Resolved</span><span className="font-semibold" style={{ color: "var(--text-primary)" }}>{totals.autoResolved ?? 0}</span></div>
            <div className="flex justify-between text-sm"><span style={{ color: "var(--text-tertiary)" }}>Avg Confidence</span><span className="font-semibold" style={{ color: "var(--text-primary)" }}>{Math.round((totals.averageConfidence ?? 0) * 100)}%</span></div>
            <div className="flex justify-between text-sm"><span style={{ color: "var(--text-tertiary)" }}>Pending Review</span><span className="font-semibold" style={{ color: "var(--text-primary)" }}>{totals.pendingReview ?? 0}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
