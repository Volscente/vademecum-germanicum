// frontend/src/components/Pagination.tsx
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  const delta = 1;
  const range: (number | "...")[] = [];

  for (
    let i = Math.max(2, current - delta);
    i <= Math.min(total - 1, current + delta);
    i++
  ) {
    range.push(i);
  }

  if (current - delta > 2) range.unshift("...");
  if (current + delta < total - 1) range.push("...");

  range.unshift(1);
  if (total > 1) range.push(total);

  return range;
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-end items-center gap-1 mt-3">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="p-1.5 rounded-md text-forest-600 dark:text-forest-300 hover:bg-forest-100 dark:hover:bg-forest-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {getPageNumbers(page, totalPages).map((p, idx) =>
        p === "..." ? (
          <span
            key={`ellipsis-${idx}`}
            className="px-1.5 text-sm text-forest-400 dark:text-forest-500"
          >
            …
          </span>
        ) : (
          <button
            type="button"
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={`min-w-[2rem] px-2 py-1 rounded-md text-sm font-medium transition-colors ${
              p === page
                ? "bg-forest-700 text-white dark:bg-forest-600"
                : "text-forest-600 dark:text-forest-300 hover:bg-forest-100 dark:hover:bg-forest-800"
            }`}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className="p-1.5 rounded-md text-forest-600 dark:text-forest-300 hover:bg-forest-100 dark:hover:bg-forest-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
