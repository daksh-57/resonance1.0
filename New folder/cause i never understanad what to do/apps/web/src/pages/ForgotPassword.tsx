import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";

export default function ForgotPassword() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  if (user) { navigate("/dashboard"); return null; }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const data = await api.auth.forgotPassword({ email });
    if ((data as any)?.error) setError((data as any).error);
    else setMsg((data as any)?.message || "If that account exists, a reset link was issued.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-base)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-display mb-1" style={{ color: "var(--text-primary)" }}>Reset password</h1>
          <p className="text-caption">Enter your email and we'll send you a reset link</p>
        </div>
        <form onSubmit={submit} className="space-y-4 surface-elevated p-6" style={{ borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)" }}>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {error && <p className="text-xs font-medium" style={{ color: "var(--color-danger)" }}>{error}</p>}
          {msg && <p className="text-xs font-medium" style={{ color: "var(--accent)" }}>{msg}</p>}
          <button className="btn btn-primary w-full" type="submit">Send reset link</button>
        </form>
        <p className="text-xs text-center mt-4" style={{ color: "var(--text-tertiary)" }}>
          <Link to="/login" className="font-medium hover:underline" style={{ color: "var(--accent)" }}>Back to login</Link>
        </p>
      </div>
    </div>
  );
}
