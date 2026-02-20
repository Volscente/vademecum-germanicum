"use client"; // The page uses React hooks (UseState and UseEffect) -> User Component

import { Word } from "@/types/word"; // Importing the interface we just made
import { useEffect, useState } from "react";

export default function Home() {
  // 1. State Management: 'words' stores the data, 'loading' handles the UI spinner
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. Data Fetching: This function talks to your FastAPI backend
  const fetchWords = async () => {
    try {
      const response = await fetch("http://localhost:8000/words/");
      const data = await response.json();
      setWords(data);
    } catch (error) {
      console.error("Error fetching words:", error);
    } finally {
      setLoading(false);
    }
  };

  // 3. Effect Hook: This runs fetchWords() once as soon as the page loads
  useEffect(() => {
    fetchWords();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Vademecum Germanicum
          </h1>
          <p className="text-gray-600 mt-2">
            Your personal German vocabulary vault.
          </p>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {loading ? (
            <p className="text-center py-10 text-gray-500">
              Loading your vocabulary...
            </p>
          ) : words.length === 0 ? (
            <p className="text-center py-10 text-gray-500 italic">
              No words found. Time to add your first one!
            </p>
          ) : (
            <div className="overflow-x-auto">
              {/* This is where the Table component will go next! */}
              <p className="text-green-600 font-medium">
                Connected! Found {words.length} words in the database.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
