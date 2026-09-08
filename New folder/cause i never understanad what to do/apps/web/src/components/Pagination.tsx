type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
      <div className="text-sm" style={{ color: "var(--text-tertiary)" }}>
        Page {page} of {totalPages}
      </div>
      <div className="flex gap-2">
        <button className="btn btn-ghost" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
        <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}
