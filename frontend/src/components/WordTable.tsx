// frontend/src/components/WordTable.tsx
import { Word } from "@/types/word";
import { BookOpen, Clock, Languages } from "lucide-react";
import { useState } from "react";
import EditWordModal from "./EditWordModal";

interface WordTableProps {
  words: Word[];
  onRefresh: () => void;
}

export default function WordTable({ words, onRefresh }: WordTableProps) {
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
                  <BookOpen className="w-4 h-4" /> Meaning
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
                onClick={() => setSelectedWord(word)}
                className="hover:bg-forest-50 dark:hover:bg-forest-800 cursor-pointer transition-colors"
              >
                <td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm">
                  <span className="font-bold text-forest-700 dark:text-forest-200">
                    {word.word}
                  </span>
                  {word.gender && word.gender !== "none" && (
                    <span className="ml-2 text-xs font-medium text-forest-400 dark:text-forest-400 uppercase">
                      ({word.gender})
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-sm text-forest-600 dark:text-forest-200">
                  {word.senses?.[0]?.meaning_summary ?? ""}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-sm">
                  <span className="inline-flex items-center rounded-md bg-forest-50 dark:bg-forest-700 px-2 py-1 text-xs font-medium text-forest-700 dark:text-forest-100 ring-1 ring-inset ring-forest-700/10 dark:ring-forest-300/20">
                    {word.category || "N/A"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-sm text-forest-400 dark:text-forest-400">
                  {new Date(word.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedWord && (
        <EditWordModal
          word={selectedWord}
          isOpen={!!selectedWord}
          onClose={() => setSelectedWord(null)}
          onWordDeleted={onRefresh}
          onWordUpdated={onRefresh}
        />
      )}
    </>
  );
}
