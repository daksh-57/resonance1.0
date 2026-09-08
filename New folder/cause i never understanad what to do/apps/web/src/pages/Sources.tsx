import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { StatusBadge } from "../components/StatusBadge";

export default function Sources() {
  const [sources, setSources] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "crm", description: "", reliability: 70 });

  const load = () => api.sources.list().then((d: any) => setSources(d.sources || []));
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.sources.create(form);
    setForm({ name: "", type: "crm", description: "", reliability: 70 });
    setOpen(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display" style={{ color: "var(--text-primary)" }}>Sources</h1>
          <p className="text-caption mt-0.5">Manage your data sources</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>New Source</button>
      </div>

      {open && (
        <div className="surface-elevated p-5" style={{ borderRadius: "var(--radius-lg)" }}>
          <h3 className="text-title mb-4" style={{ color: "var(--text-primary)" }}>Create Source</h3>
          <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Type</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="crm">CRM</option>
                <option value="erp">ERP</option>
                <option value="billing">Billing</option>
                <option value="hr">HR</option>
                <option value="other">Other</option>
                <option value="api">API</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Description</label>
              <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Reliability</label>
              <input type="number" className="input" min={0} max={100} value={form.reliability} onChange={(e) => setForm({ ...form, reliability: Number(e.target.value) })} />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn btn-primary">Create</button>
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="surface" style={{ borderRadius: "var(--radius-lg)" }}>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Name</th><th>Type</th><th>Reliability</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium" style={{ color: "var(--text-primary)" }}>{s.name}</td>
                  <td className="text-sm capitalize" style={{ color: "var(--text-secondary)" }}>{s.type}</td>
                  <td className="text-sm" style={{ color: "var(--text-secondary)" }}>{s.reliability}%</td>
                  <td><StatusBadge status={s.active ? "active" : "inactive"} /></td>
                  <td className="text-sm" style={{ color: "var(--text-tertiary)" }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {!sources.length && <tr><td colSpan={5} className="text-center py-8 text-sm" style={{ color: "var(--text-tertiary)" }}>No sources yet. Create one to start importing data.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
