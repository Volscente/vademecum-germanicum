// frontend/src/components/WordTable.tsx
import { Word } from "@/types/word";
import { BookOpen, Clock, Languages } from "lucide-react";
import { useState } from "react";
import EditWordModal from "./EditWordModal"; // Ensure you create this file next

// 1. Updated Props to include onRefresh callback
interface WordTableProps {
  words: Word[];
  onRefresh: () => void;
}

export default function WordTable({ words, onRefresh }: WordTableProps) {
  // 2. State to track which word is currently selected for the Modal
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);

  return (
    <>
      <div className="overflow-hidden shadow ring-1 ring-forest-900/10 dark:ring-forest-100/10 sm:rounded-lg">
        <table className="min-w-full divide-y divide-forest-200 dark:divide-forest-700">
          <thead className="bg-forest-50 dark:bg-forest-800">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-forest-900 dark:text-forest-100">
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4" /> German
                </div>
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-forest-900 dark:text-forest-100">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Translation
                </div>
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-forest-900 dark:text-forest-100">
                Category
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-forest-900 dark:text-forest-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Added
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-forest-100 dark:divide-forest-700 bg-white dark:bg-forest-900">
            {words.map((word) => (
              <tr
                key={word.id}
                // 3. Make row clickable to open details/edit/delete modal
                onClick={() => setSelectedWord(word)}
                className="hover:bg-forest-50 dark:hover:bg-forest-800 cursor-pointer transition-colors"
              >
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                  <span className="font-bold text-forest-700 dark:text-forest-300">
                    {word.word}
                  </span>
                  {word.gender && word.gender !== "none" && (
                    <span className="ml-2 text-xs font-medium text-forest-400 dark:text-forest-500 uppercase">
                      ({word.gender})
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-forest-600 dark:text-forest-300">
                  {word.translation}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  <span className="inline-flex items-center rounded-md bg-forest-50 dark:bg-forest-700 px-2 py-1 text-xs font-medium text-forest-700 dark:text-forest-200 ring-1 ring-inset ring-forest-700/10 dark:ring-forest-400/20">
                    {word.category || "N/A"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-forest-400 dark:text-forest-500">
                  {new Date(word.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. The Edit/Delete Modal: Only renders when a word is selected */}
      {selectedWord && (
        <EditWordModal
          word={selectedWord}
          isOpen={!!selectedWord}
          onClose={() => setSelectedWord(null)}
          onWordDeleted={onRefresh}
        />
      )}
    </>
  );
}
