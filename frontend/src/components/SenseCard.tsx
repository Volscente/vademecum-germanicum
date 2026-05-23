"use client";

import { SenseWithWord } from "@/types/word";
import { clsx } from "clsx";
import {
  ChevronDown,
  ChevronUp,
  Minus,
  ThumbsDown,
  ThumbsUp,
  TrendingDown,
} from "lucide-react";
import { useState } from "react";

interface SenseCardProps {
  sense: SenseWithWord;
  onDifficultySelect: (level: "Easy" | "Medium" | "Hard" | "VeryHard") => void;
}

export default function SenseCard({ sense, onDifficultySelect }: SenseCardProps) {
  const [wordInfoCollapsed, setWordInfoCollapsed] = useState(false);
  const [verbMorphologyCollapsed, setVerbMorphologyCollapsed] = useState(false);
  const [senseInfoCollapsed, setSenseInfoCollapsed] = useState(false);

  return (
    <div className="bg-white dark:bg-forest-800 rounded-xl shadow-sm border border-forest-200 dark:border-forest-700 p-6 space-y-4">
      {/* Word Information */}
      <div className="border border-forest-200 dark:border-forest-600 rounded-lg p-3">
        <button
          type="button"
          onClick={() => setWordInfoCollapsed((prev) => !prev)}
          className="flex w-full items-center gap-2"
        >
          {wordInfoCollapsed ? (
            <ChevronDown className="w-3 h-3 text-forest-600 dark:text-forest-300" />
          ) : (
            <ChevronUp className="w-3 h-3 text-forest-600 dark:text-forest-300" />
          )}
          <span className="text-xs font-semibold text-forest-600 dark:text-forest-300 uppercase tracking-wide">
            Word Information
          </span>
        </button>
        <div
          className={clsx(
            "overflow-hidden overflow-y-auto transition-[max-height] duration-300",
            wordInfoCollapsed ? "max-h-0" : "max-h-[500px]",
          )}
        >
          <div className="space-y-2 pt-2">
            <div>
              <p className="text-xs font-medium text-forest-500 dark:text-forest-400">Word</p>
              <p className="text-sm text-forest-800 dark:text-forest-100">{sense.word}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-forest-500 dark:text-forest-400">Translation</p>
              <p className="text-sm text-forest-800 dark:text-forest-100">{sense.translation}</p>
            </div>
            {sense.gender && (
              <div>
                <p className="text-xs font-medium text-forest-500 dark:text-forest-400">Gender</p>
                <p className="text-sm text-forest-800 dark:text-forest-100">{sense.gender}</p>
              </div>
            )}
            {sense.category && (
              <div>
                <p className="text-xs font-medium text-forest-500 dark:text-forest-400">Category</p>
                <p className="text-sm text-forest-800 dark:text-forest-100">{sense.category}</p>
              </div>
            )}
            {sense.word_plural && (
              <div>
                <p className="text-xs font-medium text-forest-500 dark:text-forest-400">Plural</p>
                <p className="text-sm text-forest-800 dark:text-forest-100">{sense.word_plural}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verb Morphology — rendered only when category is verb */}
      {sense.category === "verb" && (
        <div className="border border-forest-200 dark:border-forest-600 rounded-lg p-3">
          <button
            type="button"
            onClick={() => setVerbMorphologyCollapsed((prev) => !prev)}
            className="flex w-full items-center gap-2"
          >
            {verbMorphologyCollapsed ? (
              <ChevronDown className="w-3 h-3 text-forest-600 dark:text-forest-300" />
            ) : (
              <ChevronUp className="w-3 h-3 text-forest-600 dark:text-forest-300" />
            )}
            <span className="text-xs font-semibold text-forest-600 dark:text-forest-300 uppercase tracking-wide">
              Verb Morphology
            </span>
          </button>
          <div
            className={clsx(
              "overflow-hidden overflow-y-auto transition-[max-height] duration-300",
              verbMorphologyCollapsed ? "max-h-0" : "max-h-[500px]",
            )}
          >
            <div className="space-y-2 pt-2">
              {sense.auxiliary_verb && (
                <div>
                  <p className="text-xs font-medium text-forest-500 dark:text-forest-400">Auxiliary Verb</p>
                  <p className="text-sm text-forest-800 dark:text-forest-100">{sense.auxiliary_verb}</p>
                </div>
              )}
              {sense.principal_forms && sense.principal_forms.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-forest-500 dark:text-forest-400">Principal Forms</p>
                  <div className="flex gap-6 mt-1">
                    {["Infinitiv", "Präteritum", "Partizip II"].map((label, i) =>
                      sense.principal_forms?.[i] ? (
                        <div key={label}>
                          <p className="text-xs text-forest-400 dark:text-forest-500">{label}</p>
                          <p className="text-sm text-forest-800 dark:text-forest-100">
                            {sense.principal_forms![i]}
                          </p>
                        </div>
                      ) : null,
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sense Information */}
      <div className="border border-forest-200 dark:border-forest-600 rounded-lg p-3">
        <button
          type="button"
          onClick={() => setSenseInfoCollapsed((prev) => !prev)}
          className="flex w-full items-center gap-2"
        >
          {senseInfoCollapsed ? (
            <ChevronDown className="w-3 h-3 text-forest-600 dark:text-forest-300" />
          ) : (
            <ChevronUp className="w-3 h-3 text-forest-600 dark:text-forest-300" />
          )}
          <span className="text-xs font-semibold text-forest-600 dark:text-forest-300 uppercase tracking-wide">
            Sense Information
          </span>
        </button>
        <div
          className={clsx(
            "overflow-hidden overflow-y-auto transition-[max-height] duration-300",
            senseInfoCollapsed ? "max-h-0" : "max-h-[500px]",
          )}
        >
          <div className="space-y-3 pt-2">
            <div>
              <p className="text-xs font-medium text-forest-500 dark:text-forest-400">Meaning</p>
              <p className="text-sm text-forest-800 dark:text-forest-100">{sense.meaning_summary}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-forest-500 dark:text-forest-400">Register</p>
              <p className="text-sm text-forest-800 dark:text-forest-100">{sense.register}</p>
            </div>
            {sense.grammar_patterns.length > 0 && (
              <div>
                <p className="text-xs font-medium text-forest-500 dark:text-forest-400">Grammar Patterns</p>
                <ul className="mt-1 space-y-1">
                  {sense.grammar_patterns.map((gp, i) => (
                    <li key={i} className="text-sm text-forest-800 dark:text-forest-100">
                      {gp.preposition ? `${gp.preposition} + ${gp.case}` : gp.case}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {sense.example_sentences.length > 0 && (
              <div>
                <p className="text-xs font-medium text-forest-500 dark:text-forest-400">Example Sentences</p>
                <ul className="mt-1 space-y-3">
                  {sense.example_sentences.map((es, i) => (
                    <li key={i}>
                      <p className="text-sm text-forest-800 dark:text-forest-100">{es.german}</p>
                      <p className="text-xs text-forest-500 dark:text-forest-400 italic">{es.english}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Difficulty Buttons */}
      <div className="flex gap-2 pt-2">
        {(
          [
            {
              level: "Easy",
              label: "Easy",
              Icon: ThumbsUp,
              colorClass:
                "bg-forest-100 hover:bg-forest-200 dark:bg-forest-700/50 dark:hover:bg-forest-700 text-forest-700 dark:text-forest-200",
            },
            {
              level: "Medium",
              label: "Medium",
              Icon: Minus,
              colorClass:
                "bg-forest-50 hover:bg-forest-100 dark:bg-forest-800 dark:hover:bg-forest-700 text-forest-600 dark:text-forest-300 border border-forest-200 dark:border-forest-600",
            },
            {
              level: "Hard",
              label: "Hard",
              Icon: TrendingDown,
              colorClass:
                "bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-300",
            },
            {
              level: "VeryHard",
              label: "Very Hard",
              Icon: ThumbsDown,
              colorClass:
                "bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400",
            },
          ] as const
        ).map(({ level, label, Icon, colorClass }) => (
          <button
            key={level}
            type="button"
            onClick={() => onDifficultySelect(level)}
            className={clsx(
              "flex flex-1 items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              colorClass,
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
