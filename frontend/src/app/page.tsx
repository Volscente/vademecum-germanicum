"use client"; // The page uses React hooks (UseState and UseEffect) -> User Component

import AddWordModal from "@/components/AddWordModal";
import AreaToggle from "@/components/AreaToggle";
import SearchBar from "@/components/SearchBar";
import SensesTable from "@/components/SensesTable";
import ThemeToggle from "@/components/ThemeToggle";
import WordTable from "@/components/WordTable";
import { SenseWithWord, Word } from "@/types/word";
import { useCallback, useEffect, useState } from "react";

export default function Home() {
  // 1. State Management: 'words' stores the data, 'loading' handles the UI spinner while the words are loaded from DB, 'searchTerm' used for searching words
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // 2. Area State Management: 'area' controls the active view, 'reviewQueue' holds senses selected for review
  const [area, setArea] = useState<"vocabulary" | "learning" | "review">(
    "vocabulary",
  );
  const [reviewQueue, setReviewQueue] = useState<SenseWithWord[]>([]);

  // 3. Data Fetching: Request words from the FastAPI backend service, including search
  const fetchWords = useCallback(async (searchQuery: string = "") => {
    try {
      setLoading(true);
      // Construct URL with query parameters
      const baseUrl = "http://localhost:8000/words/";
      const url = searchQuery
        ? `${baseUrl}?search=${encodeURIComponent(searchQuery)}`
        : `${baseUrl}?limit=10`;

      const response = await fetch(url);
      const data = await response.json();
      setWords(data);
    } catch (error) {
      console.error("Error fetching words:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 4. Effect Hook: Trigger fetch whenever searchTerm changes (already debounced by component)
  useEffect(() => {
    fetchWords(searchTerm);
  }, [searchTerm, fetchWords]);

  // 5. Review Handler: sets the review queue and transitions to the Review Area
  function handleStartReview(selected: SenseWithWord[]): void {
    setReviewQueue(selected);
    setArea("review");
  }

  return (
    <main className="min-h-screen bg-forest-50 dark:bg-forest-900 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 64 64" className="w-8 h-8 flex-shrink-0" aria-hidden="true">
                <path d="M15,8H61V3H3V61H61V52H12a4,4,0,0,1-4-4V42a4,4,0,0,1,4-4H61V22H15a4,4,0,0,1-4-4V12A4,4,0,0,1,15,8Z" fill="#d8f3dc"/>
                <rect height="4" width="58" x="3" y="30" fill="#95d5b2"/>
                <rect height="4" width="58" x="3" y="57" fill="#95d5b2"/>
                <rect height="22" width="8" x="7" y="8" fill="#95d5b2"/>
                <rect height="18" width="6" x="15" y="12" fill="#52b788"/>
                <rect height="22" width="6" x="21" y="8" fill="#95d5b2"/>
                <rect height="16" width="8" x="27" y="14" fill="#52b788"/>
                <rect height="14" width="6" x="35" y="16" fill="#95d5b2"/>
                <rect height="20" width="4" x="41" y="10" fill="#52b788"/>
                <rect height="22" width="8" x="53" y="8" fill="#95d5b2"/>
                <rect height="4" width="8" x="7" y="13" fill="#d8f3dc"/>
                <rect height="4" width="8" x="53" y="12" fill="#d8f3dc"/>
                <rect height="4" width="6" x="21" y="18" fill="#d8f3dc"/>
                <rect height="6" width="18" x="7" y="51" fill="#52b788"/>
                <rect height="4" width="16" x="7" y="47" fill="#d8f3dc"/>
                <rect height="6" width="16" x="12" y="41" fill="#95d5b2"/>
                <rect height="19" width="6" x="33" y="38" fill="#52b788"/>
                <rect height="12" width="6" x="39" y="45" fill="#95d5b2"/>
                <rect height="16" width="4" x="45" y="41" fill="#52b788"/>
                <rect height="12" width="8" x="49" y="45" fill="#95d5b2"/>
                <rect height="4" width="6" x="33" y="42" fill="#d8f3dc"/>
                <rect height="6" width="4" x="16" y="51" fill="#95d5b2"/>
                <path d="M52,57V54a1,1,0,0,1,2,0v3Z" fill="#b7e4c7"/>
                <rect height="2" width="8" x="49" y="48" fill="#b7e4c7"/>
                <rect height="2" width="4" x="49" y="48" fill="#40916c"/>
                <path d="M53,53a1,1,0,0,0-1,1v3h2V55.62A4,4,0,0,1,53,53Z" fill="#40916c"/>
                <path d="M61,33H3a1,1,0,0,0,0,2H61a1,1,0,0,0,0-2Z" fill="#2d6a4f"/>
                <path d="M61,56H58V45a1,1,0,0,0-1-1H50V41a1,1,0,0,0-1-1H45a1,1,0,0,0-1,1v3H40V39a1,1,0,0,0-1-1H33a1,1,0,0,0-1,1V56H26V51a1,1,0,0,0-1-1H24V48h4a1,1,0,0,0,1-1V41a1,1,0,0,0-1-1H12a1,1,0,0,0-1,1v5H7a1,1,0,0,0-1,1v9H3a1,1,0,0,0,0,2H61a1,1,0,0,0,0-2ZM56,46v2H50V46ZM34,43h4v2H34Zm4-3v1H34V40ZM13,42H27v4H13ZM8,48H22v2H8Zm0,4h7v4H8Zm9,4V52h2v4Zm4,0V52h3v4Zm13-9h4v9H34Zm6-1h4V56H40Zm6-1V42h2V56H46Zm8,11V54a1,1,0,0,0-2,0v2H50V50h6v6Z" fill="#2d6a4f"/>
                <path d="M61,60H3a1,1,0,0,0,0,2H61a1,1,0,0,0,0-2Z" fill="#2d6a4f"/>
                <path d="M61,7H53a1,1,0,0,0-1,1V29H46V10a1,1,0,0,0-1-1H41a1,1,0,0,0-1,1v5H36V14a1,1,0,0,0-1-1H28V8a1,1,0,0,0-1-1H21a1,1,0,0,0-1,1v3H16V8a1,1,0,0,0-1-1H7A1,1,0,0,0,6,8V29H3a1,1,0,0,0,0,2H61a1,1,0,0,0,1-1V8A1,1,0,0,0,61,7Zm-7,6h6v2H54Zm6-4v2H54V9ZM22,19h4v2H22ZM22,9h4v8H22V9ZM8,14h6v2H8Zm6-5v3H8V9ZM8,18h6V29H8Zm8-1V13h4V29H16Zm6,6h4v6H22Zm6-1V15h2v4a1,1,0,0,0,2,0V15h2V29H32V26a1,1,0,0,0-2,0v3H28Zm8-5h4V29H36Zm6,12V11h2V29Zm12,0V17h6V29Z" fill="#2d6a4f"/>
                <path d="M57,22a1,1,0,0,0-1,1v3a1,1,0,0,0,2,0V23A1,1,0,0,0,57,22Z" fill="#2d6a4f"/>
                <path d="M3,4H61a1,1,0,0,0,0-2H3A1,1,0,0,0,3,4Z" fill="#2d6a4f"/>
              </svg>
              <h1 className="text-4xl font-bold text-forest-900 dark:text-forest-50">
                Vademecum Germanicum
              </h1>
            </div>
            <p className="text-forest-700 dark:text-forest-200 mt-2 ml-11">
              Your personal German vocabulary vault.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {/* Pass fetchWords so the modal can refresh the table after adding a new word */}
            <AddWordModal onWordAdded={() => fetchWords(searchTerm)} />
          </div>
        </div>

        {/* Search Bar — Vocabulary Area only */}
        {area === "vocabulary" && (
          <div className="mb-6">
            <SearchBar
              onSearch={setSearchTerm}
              placeholder="Search by word or translation..."
            />
          </div>
        )}

        {/* Area Toggle — hidden in Review Area */}
        {area !== "review" && (
          <div className="mb-4">
            <AreaToggle
              area={area}
              onAreaChange={(newArea) => setArea(newArea)}
            />
          </div>
        )}

        {/* Content Section */}
        {area === "vocabulary" && (
          <div className="bg-white dark:bg-forest-800 rounded-xl shadow-sm border border-forest-200 dark:border-forest-700 p-6">
            {loading ? (
              <p className="text-center py-10 text-forest-600 dark:text-forest-300">
                Loading your vocabulary...
              </p>
            ) : words.length === 0 ? (
              <p className="text-center py-10 text-forest-600 dark:text-forest-300 italic">
                No words found. Time to add your first one!
              </p>
            ) : (
              <div className="overflow-x-auto">
                <WordTable words={words} onRefresh={fetchWords} />
              </div>
            )}
          </div>
        )}

        {area === "learning" && (
          <div className="bg-white dark:bg-forest-800 rounded-xl shadow-sm border border-forest-200 dark:border-forest-700 p-6">
            <SensesTable onStartReview={handleStartReview} />
          </div>
        )}

        {area === "review" && (
          <div className="bg-white dark:bg-forest-800 rounded-xl shadow-sm border border-forest-200 dark:border-forest-700 p-6">
            <p className="text-center py-10 text-forest-600 dark:text-forest-300 italic">
              Review Area coming soon ({reviewQueue.length} senses queued).
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
