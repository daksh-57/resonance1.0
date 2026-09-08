import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function ApiDocs() {
  const [docs, setDocs] = useState<any>(null);

  useEffect(() => { api.docs().then((d) => setDocs(d)); }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-display" style={{ color: "var(--text-primary)" }}>API Documentation</h1>
        <p className="text-caption mt-0.5">Integration endpoints and auth details</p>
      </div>
      {!docs ? <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Loading...</p> : (
        <div className="surface p-6" style={{ borderRadius: "var(--radius-lg)" }}>
          <div className="space-y-3">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Auth: {docs.auth}</p>
            <ul className="list-disc pl-5 text-sm space-y-1" style={{ color: "var(--text-secondary)" }}>
              {docs.endpoints.map((ep: string) => <li key={ep}>{ep}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
