import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";

export default function Settings() {
  const { user, organization } = useAuth();
  const [orgName, setOrgName] = useState(organization?.name || "");
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setOrgName(organization?.name || ""); setName(user?.name || ""); }, [organization?.name, user?.name]);

  const save = async () => {
    setSaving(true);
    await api.settings.patch({ organizationName: orgName, name });
    setSaving(false);
    alert("Saved");
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-display" style={{ color: "var(--text-primary)" }}>Settings</h1>
        <p className="text-caption mt-0.5">Manage your account and organization</p>
      </div>
      <div className="surface p-6" style={{ borderRadius: "var(--radius-lg)" }}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Organization Name</label>
            <input className="input" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Your Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Email</label>
            <input className="input" value={user?.email || ""} disabled />
          </div>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
