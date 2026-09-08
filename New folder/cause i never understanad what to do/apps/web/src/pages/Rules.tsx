import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Rules() {
  const [config, setConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.rules.get().then((d) => setConfig(d)); }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    await api.rules.put({
      rules: (config.rules || []).map((r: any) => ({
        sourceId: r.sourceId,
        fieldName: r.fieldName,
        authorityScore: r.authorityScore ?? 70,
        priorityRank: r.priorityRank ?? 100,
      })),
      settings: config.settings,
    });
    setSaving(false);
    alert("Rules saved");
  };

  if (!config) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-8 w-8" style={{ border: "2px solid var(--border-default)", borderTopColor: "var(--accent)" }} /></div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-display" style={{ color: "var(--text-primary)" }}>Rules & Priorities</h1>
        <p className="text-caption mt-0.5">Configure reconciliation rules and thresholds</p>
      </div>
      <div className="surface p-6" style={{ borderRadius: "var(--radius-lg)" }}>
        <div className="space-y-6">
          <div>
            <h3 className="text-title mb-2" style={{ color: "var(--text-primary)" }}>Field Authorities</h3>
            <p className="text-sm mb-3" style={{ color: "var(--text-tertiary)" }}>Configure source reliability and field-specific authority. Rules are created automatically when you create a source. Edit them here.</p>
            {config.sources?.length === 0 && <p className="text-sm mb-3" style={{ color: "var(--text-tertiary)" }}>No sources yet. Create sources to auto-generate default rules.</p>}
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Source</th><th>Field</th><th>Authority Score</th><th>Priority Rank</th></tr></thead>
                <tbody>
                  {(config.rules || []).map((r: any) => {
                    const src = config.sources?.find((s: any) => s.id === r.sourceId);
                    return (
                      <tr key={r.id || `${r.sourceId}-${r.fieldName}`}>
                        <td className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{src?.name || r.sourceId}</td>
                        <td className="text-sm" style={{ color: "var(--text-secondary)" }}>{r.fieldName}</td>
                        <td className="text-sm" style={{ color: "var(--text-secondary)" }}>{r.authorityScore}</td>
                        <td className="text-sm" style={{ color: "var(--text-secondary)" }}>{r.priorityRank}</td>
                      </tr>
                    );
                  })}
                  {!config.rules?.length && <tr><td colSpan={4} className="text-center py-4 text-sm" style={{ color: "var(--text-tertiary)" }}>No rules configured yet. Create a source to generate defaults.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="text-title mb-3" style={{ color: "var(--text-primary)" }}>Thresholds</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Auto Match Threshold</label>
                <input className="input" type="number" step="0.01" min="0" max="1" value={config.settings?.thresholds?.autoMatch ?? 0.9} onChange={(e) => setConfig({ ...config, settings: { ...config.settings, thresholds: { ...config.settings.thresholds, autoMatch: Number(e.target.value) } } })} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Review Match Threshold</label>
                <input className="input" type="number" step="0.01" min="0" max="1" value={config.settings?.thresholds?.reviewMatch ?? 0.7} onChange={(e) => setConfig({ ...config, settings: { ...config.settings, thresholds: { ...config.settings.thresholds, reviewMatch: Number(e.target.value) } } })} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Auto Resolve Threshold</label>
                <input className="input" type="number" step="0.01" min="0" max="1" value={config.settings?.thresholds?.autoResolve ?? 0.9} onChange={(e) => setConfig({ ...config, settings: { ...config.settings, thresholds: { ...config.settings.thresholds, autoResolve: Number(e.target.value) } } })} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Medium Confidence Threshold</label>
                <input className="input" type="number" step="0.01" min="0" max="1" value={config.settings?.thresholds?.mediumConfidence ?? 0.7} onChange={(e) => setConfig({ ...config, settings: { ...config.settings, thresholds: { ...config.settings.thresholds, mediumConfidence: Number(e.target.value) } } })} />
              </div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</button>
        </div>
      </div>
    </div>
  );
}
