"use client";

import ReviewCompleteScreen from "@/components/ReviewCompleteScreen";
import SenseCard from "@/components/SenseCard";
import { updateSenseReview } from "@/lib/api";
import { SenseWithWord } from "@/types/word";
import { clsx } from "clsx";
import { useState } from "react";

interface ReviewAreaProps {
  reviewQueue: SenseWithWord[];
  onNavigate: (area: "vocabulary" | "learning") => void;
}

export default function ReviewArea({ reviewQueue, onNavigate }: ReviewAreaProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  if (reviewQueue.length === 0) {
    return (
      <div className="bg-white dark:bg-forest-800 rounded-xl shadow-sm border border-forest-200 dark:border-forest-700 p-6">
        <p className="text-center py-10 text-forest-600 dark:text-forest-300 italic">
          No senses selected for review.
        </p>
      </div>
    );
  }

  if (currentIndex >= reviewQueue.length) {
    return <ReviewCompleteScreen onNavigate={onNavigate} />;
  }

  function handleDifficultySelect(level: "Easy" | "Medium" | "Hard" | "VeryHard"): void {
    void updateSenseReview(reviewQueue[currentIndex].id, level);
    setIsTransitioning(true);
    setTimeout(() => {
      setIsTransitioning(false);
      setCurrentIndex((prev) => prev + 1);
    }, 150);
  }

  return (
    <div>
      <p className="mb-4 text-sm text-forest-500 dark:text-forest-400 text-right">
        {currentIndex + 1} / {reviewQueue.length} senses
      </p>
      <div
        className={clsx(
          "transition-all duration-150",
          isTransitioning ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0",
        )}
      >
        <SenseCard sense={reviewQueue[currentIndex]} onDifficultySelect={handleDifficultySelect} />
      </div>
    </div>
  );
}
