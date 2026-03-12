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
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4" /> German
                </div>
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Translation
                </div>
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Category
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Added
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {words.map((word) => (
              <tr
                key={word.id}
                // 3. Make row clickable to open details/edit/delete modal
                onClick={() => setSelectedWord(word)}
                className="hover:bg-indigo-50 cursor-pointer transition-colors"
              >
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                  <span className="font-bold text-indigo-600">{word.word}</span>
                  {word.gender && word.gender !== "none" && (
                    <span className="ml-2 text-xs font-medium text-gray-400 uppercase">
                      ({word.gender})
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {word.translation}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                    {word.category || "N/A"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">
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
