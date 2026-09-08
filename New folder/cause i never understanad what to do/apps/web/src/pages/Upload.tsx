import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = async () => {
    setError("");
    if (!file) return setError("Choose a file");
    const form = new FormData();
    form.append("file", file);
    try {
      const res: any = await api.upload.start(form);
      if (res?.data?.error) setError(res.data.error);
      else {
        setPreview(res?.data || {});
        setStep(2);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const confirmMapping = async () => {
    if (!preview?.datasetId) return;
    await api.datasets.setMapping(preview.datasetId, preview.mapping || {});
    const job = await api.datasets.import(preview.datasetId);
    setPreview({ ...preview, job });
    setStep(3);
  };

  const [jobStatus, setJobStatus] = useState<any>(null);

  useEffect(() => {
    if (step !== 3 || !preview?.job?.id) return;
    const timer = setInterval(async () => {
      const j = await api.jobs.get(preview.job.id);
      setJobStatus(j?.job);
      if (j?.job?.status === "completed" || j?.job?.status === "failed" || j?.job?.status === "cancelled") clearInterval(timer);
    }, 1500);
    return () => clearInterval(timer);
  }, [step, preview?.job?.id]);

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-display" style={{ color: "var(--text-primary)" }}>Upload Dataset</h1>
        <p className="text-caption mt-0.5">Upload a CSV, XLSX, or JSON file for reconciliation</p>
      </div>
      {step === 1 && (
        <div className="surface-elevated p-6" style={{ borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)" }}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.json,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="input"
              />
              {file && <p className="text-xs mt-1.5" style={{ color: "var(--text-secondary)" }}>Selected: {file.name}</p>}
            </div>
            {error && <p className="text-xs font-medium" style={{ color: "var(--color-danger)" }}>{error}</p>}
            <button className="btn btn-primary" type="button" onClick={upload} disabled={!file}>Upload</button>
          </div>
        </div>
      )}

      {step === 2 && preview && (
        <div className="surface-elevated p-6" style={{ borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)" }}>
          <div className="space-y-4">
            <div>
              <h3 className="text-title" style={{ color: "var(--text-primary)" }}>Preview & Mapping</h3>
              <p className="text-caption mt-0.5">Rows: {preview.rowCount} • Fields: {preview.fields?.join(", ")}</p>
            </div>
            {preview.errors?.length > 0 && (
              <div className="p-3 rounded-lg text-sm" style={{ background: "var(--danger-soft)", color: "var(--color-danger)" }}>
                {preview.errors.map((e: string, i: number) => <div key={i}>{e}</div>)}
              </div>
            )}
            <div className="table-wrap">
              <table className="data">
                <thead><tr>{preview.headers?.map((h: string) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {preview.preview?.map((row: any, i: number) => (
                    <tr key={i}>{preview.headers?.map((h: string) => <td key={h} className="text-sm" style={{ color: "var(--text-secondary)" }}>{row[h] as string}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={confirmMapping}>Confirm & Import</button>
              <button className="btn btn-ghost" onClick={() => { setStep(1); setPreview(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="surface-elevated p-6" style={{ borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)" }}>
          <div className="space-y-3">
            <h3 className="text-title" style={{ color: "var(--text-primary)" }}>Import Started</h3>
            {jobStatus ? (
              <div>
                <div className="flex justify-between text-sm mb-1"><span style={{ color: "var(--text-tertiary)" }}>Status</span><span className="font-medium capitalize" style={{ color: "var(--text-primary)" }}>{jobStatus.status}</span></div>
                <div className="flex justify-between text-sm mb-1"><span style={{ color: "var(--text-tertiary)" }}>Progress</span><span className="font-medium" style={{ color: "var(--text-primary)" }}>{jobStatus.progress ?? 0}%</span></div>
                <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: "var(--bg-muted)" }}><div className="h-full transition-all" style={{ background: "var(--accent)", width: `${jobStatus.progress ?? 0}%` }} /></div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Initializing import...</p>
            )}
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Check Datasets for details once complete.</p>
          </div>
        </div>
      )}
    </div>
  );
}
