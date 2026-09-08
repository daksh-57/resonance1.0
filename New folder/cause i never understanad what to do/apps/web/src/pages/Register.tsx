import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../lib/auth";

export default function Register() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");

  if (user) { navigate("/dashboard"); return null; }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("Passwords do not match");
    const res = await register({ name, email, password, confirmPassword: confirm, organizationName: orgName || undefined });
    if (res.error) setError(res.error);
    else navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-base)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-display mb-1" style={{ color: "var(--text-primary)" }}>Create account</h1>
          <p className="text-caption">Get started with ReconcileAI</p>
        </div>
        <form onSubmit={submit} className="space-y-4 surface-elevated p-6 rounded-xl" style={{ boxShadow: "var(--shadow-md)" }}>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required minLength={2} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Organization <span style={{ color: "var(--text-tertiary)" }}>(optional)</span></label>
            <input className="input" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Corp" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" required minLength={8} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Confirm password</label>
            <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" required />
          </div>
          {error && <p className="text-xs font-medium" style={{ color: "var(--color-danger)" }}>{error}</p>}
          <button className="btn btn-primary w-full" type="submit">Create account</button>
        </form>
        <p className="text-xs text-center mt-4" style={{ color: "var(--text-tertiary)" }}>
          Already have an account? <Link to="/login" className="font-medium hover:underline" style={{ color: "var(--accent)" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
