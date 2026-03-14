"use client"; // The page uses React hooks (UseState and UseEffect) -> User Component

import AddWordModal from "@/components/AddWordModal";
import ThemeToggle from "@/components/ThemeToggle";
import WordTable from "@/components/WordTable";
import { Word } from "@/types/word";
import { useEffect, useState } from "react";

export default function Home() {
  // 1. State Management: 'words' stores the data, 'loading' handles the UI spinner while the words are loaded from DB
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. Data Fetching: Request words from the FastAPI backend service
  const fetchWords = async () => {
    try {
      const response = await fetch("http://localhost:8000/words/");
      const data = await response.json();
      setWords(data);
    } catch (error) {
      console.error("Error fetching words:", error);
    } finally {
      setLoading(false); // Set to false after loading words or an error occured
    }
  };

  // 3. Effect Hook: This runs fetchWords() once as soon as the page loads
  useEffect(() => {
    fetchWords();
  }, []);

  return (
    <main className="min-h-screen bg-forest-50 dark:bg-forest-900 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-bold text-forest-900 dark:text-forest-50">
              Vademecum Germanicum
            </h1>
            <p className="text-forest-700 dark:text-forest-300 mt-2">
              Your personal German vocabulary vault.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {/* Pass fetchWords so the modal can refresh the table after adding a new word */}
            <AddWordModal onWordAdded={fetchWords} />
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white dark:bg-forest-800 rounded-xl shadow-sm border border-forest-200 dark:border-forest-700 p-6">
          {loading ? (
            <p className="text-center py-10 text-forest-600 dark:text-forest-400">
              Loading your vocabulary...
            </p>
          ) : words.length === 0 ? (
            <p className="text-center py-10 text-forest-600 dark:text-forest-400 italic">
              No words found. Time to add your first one!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <WordTable words={words} onRefresh={fetchWords} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
