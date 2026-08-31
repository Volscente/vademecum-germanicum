// frontend/src/components/RowsPerPageSelect.tsx
interface RowsPerPageSelectProps {
  id: string;
  value: number;
  onChange: (value: number) => void;
}

export default function RowsPerPageSelect({
  id,
  value,
  onChange,
}: RowsPerPageSelectProps) {
  return (
    <div className="flex justify-end items-center gap-2 mb-3">
      <label htmlFor={id} className="text-sm text-forest-600 dark:text-forest-300">
        Rows:
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="text-sm text-forest-700 dark:text-forest-100 dark:bg-forest-900 bg-white border border-forest-200 dark:border-forest-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-forest-500 dark:focus:ring-forest-400"
      >
        <option value={10}>10</option>
        <option value={25}>25</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
        <option value={100000}>All</option>
      </select>
    </div>
  );
}
