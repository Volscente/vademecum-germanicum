// frontend/src/components/WordTable.tsx
import { Word } from "@/types/word";
import { BookOpen, ChevronDown, ChevronUp, ChevronsUpDown, Clock, Languages } from "lucide-react";
import { useMemo, useState } from "react";
import EditWordModal from "./EditWordModal";

type SortKey = "word" | "meaning" | "category" | "created_at";
type SortDir = "asc" | "desc";

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
  if (sortKey !== col) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />;
  return sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />;
}

interface WordTableProps {
  words: Word[];
  onRefresh: () => void;
}

export default function WordTable({ words, onRefresh }: WordTableProps) {
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return words;
    return [...words].sort((a, b) => {
      let av: string, bv: string;
      if (sortKey === "word") { av = a.word; bv = b.word; }
      else if (sortKey === "meaning") { av = a.senses?.[0]?.meaning_summary ?? ""; bv = b.senses?.[0]?.meaning_summary ?? ""; }
      else if (sortKey === "category") { av = a.category ?? ""; bv = b.category ?? ""; }
      else { av = a.created_at; bv = b.created_at; }
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [words, sortKey, sortDir]);

  return (
    <>
      <div className="overflow-hidden shadow ring-1 ring-forest-900/10 dark:ring-forest-100/10 sm:rounded-lg">
        <table className="min-w-full divide-y divide-forest-200 dark:divide-forest-700">
          <thead className="bg-forest-50 dark:bg-forest-800">
            <tr>
              <th onClick={() => handleSort("word")} className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-forest-900 dark:text-forest-100 cursor-pointer select-none hover:text-forest-600 dark:hover:text-forest-300">
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4" /> German <SortIcon col="word" sortKey={sortKey} sortDir={sortDir} />
                </div>
              </th>
              <th onClick={() => handleSort("meaning")} className="px-3 py-3.5 text-left text-sm font-semibold text-forest-900 dark:text-forest-100 cursor-pointer select-none hover:text-forest-600 dark:hover:text-forest-300">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Meaning <SortIcon col="meaning" sortKey={sortKey} sortDir={sortDir} />
                </div>
              </th>
              <th onClick={() => handleSort("category")} className="px-3 py-3.5 text-left text-sm font-semibold text-forest-900 dark:text-forest-100 cursor-pointer select-none hover:text-forest-600 dark:hover:text-forest-300">
                <div className="flex items-center gap-2">
                  Category <SortIcon col="category" sortKey={sortKey} sortDir={sortDir} />
                </div>
              </th>
              <th onClick={() => handleSort("created_at")} className="px-3 py-3.5 text-left text-sm font-semibold text-forest-900 dark:text-forest-100 cursor-pointer select-none hover:text-forest-600 dark:hover:text-forest-300">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Added <SortIcon col="created_at" sortKey={sortKey} sortDir={sortDir} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-forest-100 dark:divide-forest-700 bg-white dark:bg-forest-900">
            {sorted.map((word) => (
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
