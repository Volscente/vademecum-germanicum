"use client";

import { getSenses } from "@/lib/api";
import { toReview } from "@/lib/reviewUtils";
import { SenseWithWord } from "@/types/word";
import { BookMarked } from "lucide-react";
import { useEffect, useState } from "react";

interface SensesTableProps {
  onStartReview: (selected: SenseWithWord[]) => void;
}

export default function SensesTable({ onStartReview }: SensesTableProps) {
  const [senses, setSenses] = useState<SenseWithWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSenseIds, setSelectedSenseIds] = useState<Set<number>>(
    new Set(),
  );

  useEffect(() => {
    getSenses()
      .then(setSenses)
      .catch((err) => console.error("Error fetching senses:", err))
      .finally(() => setLoading(false));
  }, []);

  const toggleSelect = (id: number) => {
    setSelectedSenseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleStartReview = () => {
    const selected = senses.filter((s) => selectedSenseIds.has(s.id!));
    onStartReview(selected);
  };

  if (loading) {
    return (
      <p className="text-center py-10 text-forest-600 dark:text-forest-300">
        Loading senses...
      </p>
    );
  }

  if (senses.length === 0) {
    return (
      <p className="text-center py-10 text-forest-600 dark:text-forest-300 italic">
        No senses found. Add words with senses first.
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-hidden shadow ring-1 ring-forest-900/10 dark:ring-forest-100/10 sm:rounded-lg">
        <table className="min-w-full divide-y divide-forest-200 dark:divide-forest-700">
          <thead className="bg-forest-50 dark:bg-forest-800">
            <tr>
              <th className="py-3.5 pl-4 pr-3 w-10" />
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-forest-900 dark:text-forest-100">
                Word
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-forest-900 dark:text-forest-100">
                Translation
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-forest-900 dark:text-forest-100">
                Category
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-forest-900 dark:text-forest-100">
                Difficulty
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-forest-900 dark:text-forest-100">
                Last Reviewed
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-forest-900 dark:text-forest-100">
                To Review
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-forest-100 dark:divide-forest-700 bg-white dark:bg-forest-900">
            {senses.map((sense) => {
              const id = sense.id!;
              const isSelected = selectedSenseIds.has(id);
              const needsReview = toReview(sense);
              const difficulty = sense.difficulty_level ?? "Medium";
              const lastReviewed = sense.last_reviewed_at
                ? new Date(sense.last_reviewed_at).toLocaleDateString()
                : "Never";

              return (
                <tr
                  key={id}
                  onClick={() => toggleSelect(id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-forest-50 dark:bg-forest-800/60"
                      : "hover:bg-forest-50 dark:hover:bg-forest-800"
                  }`}
                >
                  <td className="pl-4 pr-3 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-forest-300 text-forest-600 focus:ring-forest-500"
                    />
                  </td>
                  <td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm font-bold text-forest-700 dark:text-forest-200">
                    {sense.word}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-forest-600 dark:text-forest-200">
                    {sense.translation}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm">
                    <span className="inline-flex items-center rounded-md bg-forest-50 dark:bg-forest-700 px-2 py-1 text-xs font-medium text-forest-700 dark:text-forest-100 ring-1 ring-inset ring-forest-700/10 dark:ring-forest-300/20">
                      {sense.category ?? "N/A"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-forest-600 dark:text-forest-200">
                    {difficulty}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-forest-400 dark:text-forest-400">
                    {lastReviewed}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm">
                    {needsReview && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-900/30 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-600/20">
                        <BookMarked className="w-3 h-3" />
                        Review
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedSenseIds.size > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleStartReview}
            className="px-4 py-2 rounded-lg bg-forest-700 hover:bg-forest-800 dark:bg-forest-600 dark:hover:bg-forest-500 text-white text-sm font-medium transition-colors"
          >
            Start Review ({selectedSenseIds.size})
          </button>
        </div>
      )}
    </div>
  );
}
