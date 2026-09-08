import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (user) { navigate("/dashboard"); return null; }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await login({ email, password });
    if (res.error) setError(res.error);
    else navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-base)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-display mb-1" style={{ color: "var(--text-primary)" }}>Sign in</h1>
          <p className="text-caption">Enter your credentials to access your workspace</p>
        </div>
        <form onSubmit={submit} className="space-y-4 surface-elevated p-6 rounded-xl" style={{ boxShadow: "var(--shadow-md)" }}>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <p className="text-xs font-medium" style={{ color: "var(--color-danger)" }}>{error}</p>}
          <button className="btn btn-primary w-full" type="submit">Sign in</button>
        </form>
        <p className="text-xs text-center mt-4" style={{ color: "var(--text-tertiary)" }}>
          <Link to="/forgot-password" className="font-medium hover:underline" style={{ color: "var(--accent)" }}>Forgot password?</Link>
          <span className="mx-2">·</span>
          <Link to="/register" className="font-medium hover:underline" style={{ color: "var(--accent)" }}>Create account</Link>
        </p>
      </div>
    </div>
  );
}
