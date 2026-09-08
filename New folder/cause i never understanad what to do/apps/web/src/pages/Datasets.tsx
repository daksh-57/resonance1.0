import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../lib/api";
import { StatusBadge } from "../components/StatusBadge";

export default function Datasets() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = () => api.datasets.list().then((d: any) => setDatasets(d.datasets || []));
  useEffect(() => { load(); }, []);

  const remove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this dataset and all related data? This cannot be undone.")) return;
    setDeletingId(id);
    await api.datasets.remove(id);
    setDeletingId(null);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display" style={{ color: "var(--text-primary)" }}>Datasets</h1>
          <p className="text-caption mt-0.5">Manage your imported datasets</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/upload")}>Upload Dataset</button>
      </div>

      <div className="surface" style={{ borderRadius: "var(--radius-lg)" }}>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Name</th><th>Source</th><th>Status</th><th>Rows</th><th>Valid</th><th>Invalid</th><th>Conflicts</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {datasets.map((ds) => (
                <tr key={ds.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/datasets/${ds.id}`)}>
                  <td className="font-medium" style={{ color: "var(--text-primary)" }}>{ds.name}</td>
                  <td className="text-sm" style={{ color: "var(--text-secondary)" }}>{ds.sourceName || ds.sourceId}</td>
                  <td><StatusBadge status={ds.status} /></td>
                  <td className="text-sm" style={{ color: "var(--text-secondary)" }}>{ds.rowCount}</td>
                  <td className="text-sm" style={{ color: "var(--text-secondary)" }}>{ds.validCount}</td>
                  <td className="text-sm" style={{ color: "var(--text-secondary)" }}>{ds.invalidCount}</td>
                  <td className="text-sm" style={{ color: "var(--text-secondary)" }}>{ds.conflictCount}</td>
                  <td className="text-sm" style={{ color: "var(--text-tertiary)" }}>{new Date(ds.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn btn-danger"
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                      disabled={deletingId === ds.id}
                      onClick={(e) => remove(e, ds.id)}
                    >
                      {deletingId === ds.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
              {!datasets.length && <tr><td colSpan={9} className="text-center py-8 text-sm" style={{ color: "var(--text-tertiary)" }}>No datasets yet. Upload a CSV, XLSX, or JSON file to get started.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
