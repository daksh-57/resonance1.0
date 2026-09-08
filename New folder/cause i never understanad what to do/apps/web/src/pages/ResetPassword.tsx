import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";

export default function ResetPassword() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (user) { navigate("/dashboard"); return null; }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await api.auth.resetPassword({ token, password });
    if ((data as any)?.error) setError((data as any).error);
    else navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-base)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-display mb-1" style={{ color: "var(--text-primary)" }}>Set new password</h1>
          <p className="text-caption">Choose a strong password</p>
        </div>
        <form onSubmit={submit} className="space-y-4 surface-elevated p-6" style={{ borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)" }}>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>New password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          {error && <p className="text-xs font-medium" style={{ color: "var(--color-danger)" }}>{error}</p>}
          <button className="btn btn-primary w-full" type="submit">Reset password</button>
        </form>
      </div>
    </div>
  );
}
