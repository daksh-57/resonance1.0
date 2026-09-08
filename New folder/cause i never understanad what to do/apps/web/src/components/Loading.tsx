export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center">
      <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} style={{ color: "var(--accent)" }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    </div>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: "var(--bg-muted)" }}>
      <div className="h-full transition-all" style={{ background: "var(--accent)", width: `${pct}%` }} />
    </div>
  );
}
