import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Schedules() {
  const [items, setItems] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", sourceId: "", interval: "daily", endpoint: "", token: "", mapping: {} });

  const load = () => Promise.all([api.schedules.list(), api.sources.list()]).then(([d, s]) => { setItems(d.schedules || []); setSources(s.sources || []); });
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.schedules.create(form);
    setOpen(false);
    setForm({ name: "", sourceId: "", interval: "daily", endpoint: "", token: "", mapping: {} });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display" style={{ color: "var(--text-primary)" }}>Scheduled Imports</h1>
          <p className="text-caption mt-0.5">Automate recurring data imports</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>New Schedule</button>
      </div>
      {open && (
        <div className="surface-elevated p-5" style={{ borderRadius: "var(--radius-lg)" }}>
          <h3 className="text-title mb-4" style={{ color: "var(--text-primary)" }}>Create Schedule</h3>
          <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Source</label>
              <select className="input" value={form.sourceId} onChange={(e) => setForm({ ...form, sourceId: e.target.value })} required>
                <option value="">Select source</option>
                {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Interval</label>
              <select className="input" value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value })}>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Endpoint</label>
              <input className="input" value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Token (optional)</label>
              <input className="input" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" className="btn btn-primary">Create</button>
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
      <div className="surface" style={{ borderRadius: "var(--radius-lg)" }}>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Name</th><th>Source</th><th>Interval</th><th>Endpoint</th><th>Active</th></tr></thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium" style={{ color: "var(--text-primary)" }}>{s.name}</td>
                  <td className="text-sm" style={{ color: "var(--text-secondary)" }}>{s.sourceName || s.sourceId}</td>
                  <td className="text-sm capitalize" style={{ color: "var(--text-secondary)" }}>{s.interval}</td>
                  <td className="text-sm" style={{ color: "var(--text-secondary)" }}>{s.endpoint || "-"}</td>
                  <td><span className="badge" style={{ background: s.active ? "var(--accent-soft)" : "var(--bg-muted)", color: s.active ? "var(--accent)" : "var(--text-secondary)" }}>{s.active ? "active" : "inactive"}</span></td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan={5} className="text-center py-8 text-sm" style={{ color: "var(--text-tertiary)" }}>No schedules.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
