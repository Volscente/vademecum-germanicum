"use client";

type Area = "vocabulary" | "learning";

interface AreaToggleProps {
  area: Area;
  onAreaChange: (area: Area) => void;
}

export default function AreaToggle({ area, onAreaChange }: AreaToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-forest-100 dark:bg-forest-800 w-fit">
      <button
        onClick={() => onAreaChange("vocabulary")}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
          area === "vocabulary"
            ? "bg-white dark:bg-forest-700 text-forest-900 dark:text-forest-50 shadow-sm"
            : "text-forest-600 dark:text-forest-300 hover:text-forest-900 dark:hover:text-forest-100"
        }`}
      >
        Vocabulary
      </button>
      <button
        onClick={() => onAreaChange("learning")}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
          area === "learning"
            ? "bg-white dark:bg-forest-700 text-forest-900 dark:text-forest-50 shadow-sm"
            : "text-forest-600 dark:text-forest-300 hover:text-forest-900 dark:hover:text-forest-100"
        }`}
      >
        Learning
      </button>
    </div>
  );
}
