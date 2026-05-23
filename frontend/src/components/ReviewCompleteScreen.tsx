"use client";

interface ReviewCompleteScreenProps {
  onNavigate: (area: "vocabulary" | "learning") => void;
}

export default function ReviewCompleteScreen({ onNavigate }: ReviewCompleteScreenProps) {
  return (
    <div className="bg-white dark:bg-forest-800 rounded-xl shadow-sm border border-forest-200 dark:border-forest-700 p-6 text-center">
      <h2 className="text-xl font-semibold text-forest-900 dark:text-forest-50 mb-2">
        Review Complete
      </h2>
      <p className="text-sm text-forest-600 dark:text-forest-300 mb-8">
        All senses in your queue have been reviewed.
      </p>
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate("vocabulary")}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-forest-100 hover:bg-forest-200 dark:bg-forest-700/50 dark:hover:bg-forest-700 text-forest-700 dark:text-forest-200 transition-colors"
        >
          Return to Vocabulary Area
        </button>
        <button
          type="button"
          onClick={() => onNavigate("learning")}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-forest-100 hover:bg-forest-200 dark:bg-forest-700/50 dark:hover:bg-forest-700 text-forest-700 dark:text-forest-200 transition-colors"
        >
          Return to Learning Area
        </button>
      </div>
    </div>
  );
}
