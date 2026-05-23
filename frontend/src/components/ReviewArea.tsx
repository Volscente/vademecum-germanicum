"use client";

import SenseCard from "@/components/SenseCard";
import { SenseWithWord } from "@/types/word";

interface ReviewAreaProps {
  reviewQueue: SenseWithWord[];
  onNavigate: (area: "vocabulary" | "learning") => void;
}

export default function ReviewArea({ reviewQueue }: ReviewAreaProps) {
  if (reviewQueue.length === 0) {
    return (
      <div className="bg-white dark:bg-forest-800 rounded-xl shadow-sm border border-forest-200 dark:border-forest-700 p-6">
        <p className="text-center py-10 text-forest-600 dark:text-forest-300 italic">
          No senses selected for review.
        </p>
      </div>
    );
  }

  const sense = reviewQueue[0];

  return (
    <div>
      <p className="mb-4 text-sm text-forest-500 dark:text-forest-400 text-right">
        1 / {reviewQueue.length} senses
      </p>
      <SenseCard sense={sense} onDifficultySelect={() => {}} />
    </div>
  );
}
