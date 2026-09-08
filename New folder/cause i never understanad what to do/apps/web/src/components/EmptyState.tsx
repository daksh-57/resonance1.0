export function EmptyState({ title, message, action, onAction }: { title: string; message: string; action?: string; onAction?: () => void }) {
  return (
    <div className="p-8 text-center">
      <div className="text-4xl mb-3">📭</div>
      <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{title}</h3>
      <p className="text-sm mb-4" style={{ color: "var(--text-tertiary)" }}>{message}</p>
      {action && onAction && (
        <button className="btn btn-primary" onClick={onAction}>{action}</button>
      )}
    </div>
  );
}
