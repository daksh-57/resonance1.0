import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#0f766e", "#115e59", "#b45309", "#be123c", "#64748b"];

export default function Analytics() {
  const [data, setData] = useState<any>(null);

  useEffect(() => { api.dashboard().then((d) => setData(d)); }, []);

  if (!data) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-8 w-8" style={{ border: "2px solid var(--border-default)", borderTopColor: "var(--accent)" }} /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display" style={{ color: "var(--text-primary)" }}>Analytics</h1>
        <p className="text-caption mt-0.5">Insights into your reconciliation data</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="surface p-5" style={{ borderRadius: "var(--radius-lg)" }}>
          <h3 className="text-title mb-4" style={{ color: "var(--text-primary)" }}>Records by Source</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.charts?.recordsBySource || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="source" tick={{ fontSize: 12, fill: "var(--text-tertiary)" }} />
              <YAxis tick={{ fontSize: 12, fill: "var(--text-tertiary)" }} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="surface p-5" style={{ borderRadius: "var(--radius-lg)" }}>
          <h3 className="text-title mb-4" style={{ color: "var(--text-primary)" }}>Conflicts by Severity</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data.charts?.severity || []} dataKey="n" nameKey="severity" cx="50%" cy="50%" outerRadius={80} label>
                {(data.charts?.severity || []).map((entry: any, index: number) => (
                  <Cell key={entry.severity} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
