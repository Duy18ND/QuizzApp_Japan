import { Button } from '../ui';

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
}

export function AdminPagination({ page, totalPages, onPageChange }: AdminPaginationProps) {
  return (
    <div className="flex items-center justify-between border-t border-line bg-glass-soft px-4 py-2.5 text-xs text-muted">
      <span className="tabular">
        Trang {page} / {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Trước
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Sau
        </Button>
      </div>
    </div>
  );
}
