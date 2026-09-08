import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { api } from "../lib/api";

export default function DatasetDetail() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) api.datasets.get(id).then((d: any) => setData(d));
  }, [id]);

  if (!data) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-8 w-8" style={{ border: "2px solid var(--border-default)", borderTopColor: "var(--accent)" }} /></div>;

  const { dataset, files, jobs } = data;

  const remove = async () => {
    if (!id || !confirm("Delete this dataset and all related data? This cannot be undone.")) return;
    setDeleting(true);
    await api.datasets.remove(id);
    navigate("/datasets");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="btn btn-ghost" onClick={() => navigate("/datasets")}>← Back to Datasets</button>
        <button className="btn btn-danger" onClick={remove} disabled={deleting}>{deleting ? "Deleting..." : "Delete Dataset"}</button>
      </div>
      <div className="surface-elevated p-6" style={{ borderRadius: "var(--radius-lg)" }}>
        <h2 className="text-title" style={{ color: "var(--text-primary)" }}>{dataset.name}</h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>Status: {dataset.status} • Rows: {dataset.rowCount}</p>
      </div>
      <div className="surface p-6" style={{ borderRadius: "var(--radius-lg)" }}>
        <h3 className="text-title mb-3" style={{ color: "var(--text-primary)" }}>Uploaded Files</h3>
        {files.length === 0 ? <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No files</p> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Name</th><th>Size</th><th>Uploaded</th><th>SHA-256</th></tr></thead>
              <tbody>
                {files.map((f: any) => (
                  <tr key={f.id}>
                    <td className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{f.originalName}</td>
                    <td className="text-sm" style={{ color: "var(--text-secondary)" }}>{(f.sizeBytes / 1024).toFixed(1)} KB</td>
                    <td className="text-sm" style={{ color: "var(--text-tertiary)" }}>{new Date(f.createdAt).toLocaleString()}</td>
                    <td className="text-xs" style={{ color: "var(--text-tertiary)" }}>{f.sha256?.slice(0, 16)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="surface p-6" style={{ borderRadius: "var(--radius-lg)" }}>
        <h3 className="text-title mb-3" style={{ color: "var(--text-primary)" }}>Jobs</h3>
        {jobs.length === 0 ? <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No jobs yet.</p> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Type</th><th>Status</th><th>Progress</th><th>Created</th></tr></thead>
              <tbody>
                {jobs.map((j: any) => (
                  <tr key={j.id}>
                    <td className="text-sm" style={{ color: "var(--text-secondary)" }}>{j.type}</td>
                    <td className="text-sm capitalize" style={{ color: "var(--text-secondary)" }}>{j.status}</td>
                    <td className="text-sm" style={{ color: "var(--text-secondary)" }}>{j.progress}%</td>
                    <td className="text-sm" style={{ color: "var(--text-tertiary)" }}>{new Date(j.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
