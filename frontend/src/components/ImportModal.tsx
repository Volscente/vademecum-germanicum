// frontend/src/components/ImportModal.tsx
"use client";

import {
  csvRowToResource,
  csvRowToWord,
  DetectedFile,
  detectFileKind,
  importResourceRecord,
  importWordRecord,
  ImportResult,
  sanitizeResourceForImport,
  sanitizeWordForImport,
  SanitizeResult,
} from "@/lib/exportImport";
import { Upload } from "lucide-react";
import { useState } from "react";

interface ImportModalProps {
  onWordsImported: () => void;
  onResourcesImported: () => void;
}

interface TableSummary {
  added: number;
  duplicate: number;
  failed: { row: number; reason: string }[];
}

interface ImportSummary {
  words?: TableSummary;
  resources?: TableSummary;
}

type Phase = "idle" | "importing" | "done";

const inputClass =
  "text-forest-800 dark:text-forest-100 dark:bg-forest-900 border border-forest-300 dark:border-forest-600 w-full p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 dark:focus:ring-forest-400";

const labelClass =
  "text-forest-700 dark:text-forest-100 block text-sm font-medium";

async function processTable<T>(
  records: unknown[],
  sanitize: (raw: unknown) => SanitizeResult<T>,
  post: (payload: T) => Promise<ImportResult>,
): Promise<TableSummary> {
  const summary: TableSummary = { added: 0, duplicate: 0, failed: [] };
  for (let i = 0; i < records.length; i++) {
    const { data, error } = sanitize(records[i]);
    if (error || !data) {
      summary.failed.push({ row: i + 1, reason: error ?? "Invalid record" });
      continue;
    }
    const result = await post(data);
    if (result.outcome === "added") summary.added += 1;
    else if (result.outcome === "duplicate") summary.duplicate += 1;
    else summary.failed.push({ row: i + 1, reason: result.reason ?? "Unknown error" });
  }
  return summary;
}

function ResultBlock({ title, result }: { title: string; result: TableSummary }) {
  return (
    <div>
      <p className="text-forest-800 dark:text-forest-100 text-sm font-semibold">
        {title}
      </p>
      <p className="text-forest-600 dark:text-forest-300 text-sm">
        {result.added} added · {result.duplicate} skipped (already existed) ·{" "}
        {result.failed.length} failed
      </p>
      {result.failed.length > 0 && (
        <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-red-500 space-y-0.5">
          {result.failed.map((f) => (
            <li key={f.row}>
              Row {f.row}: {f.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ImportModal({
  onWordsImported,
  onResourcesImported,
}: ImportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState<DetectedFile | null>(null);
  const [includeWords, setIncludeWords] = useState(false);
  const [includeResources, setIncludeResources] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const resetState = () => {
    setError(null);
    setDetected(null);
    setIncludeWords(false);
    setIncludeResources(false);
    setPhase("idle");
    setSummary(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    resetState();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    resetState();
    const selected = event.target.files?.[0];
    if (!selected) return;

    const text = await selected.text();
    if (!text.trim()) {
      setError("File is empty.");
      return;
    }

    const result = detectFileKind(text);
    if (result.kind === "unknown") {
      setError(
        "This file doesn't match the Vocabulary or Resources export format.",
      );
      return;
    }

    setDetected(result);
    setIncludeWords(!!result.words && result.words.length > 0);
    setIncludeResources(!!result.resources && result.resources.length > 0);
  };

  const handleStartImport = async () => {
    if (!detected) return;
    setPhase("importing");

    const isCsv = detected.kind !== "json";
    const newSummary: ImportSummary = {};

    if (includeWords && detected.words) {
      newSummary.words = await processTable(
        detected.words,
        isCsv
          ? (raw) => csvRowToWord(raw as Record<string, string>)
          : sanitizeWordForImport,
        importWordRecord,
      );
    }

    if (includeResources && detected.resources) {
      newSummary.resources = await processTable(
        detected.resources,
        isCsv
          ? (raw) => csvRowToResource(raw as Record<string, string>)
          : sanitizeResourceForImport,
        importResourceRecord,
      );
    }

    setSummary(newSummary);
    setPhase("done");
    if (newSummary.words) onWordsImported();
    if (newSummary.resources) onResourcesImported();
  };

  const canStart =
    phase !== "importing" &&
    !!detected &&
    ((includeWords && !!detected.words?.length) ||
      (includeResources && !!detected.resources?.length));

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 border border-forest-300 dark:border-forest-600 text-forest-700 dark:text-forest-100 px-4 py-2 rounded-lg hover:bg-forest-50 dark:hover:bg-forest-800 transition-colors"
      >
        <Upload className="w-5 h-5" /> Import
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-forest-800 p-6 rounded-xl shadow-sm w-full max-w-lg max-h-[90vh] flex flex-col">
            <h2 className="text-forest-800 dark:text-forest-100 text-xl font-bold mb-4 shrink-0">
              Import Data
            </h2>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className={labelClass}>
                  Vocabulary or Resources export file (.json or .csv)
                </label>
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileChange}
                  className={inputClass}
                />
                {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
              </div>

              {detected && phase !== "done" && (
                <div className="space-y-2">
                  <p className={labelClass}>What should be imported?</p>
                  <label className="flex items-center gap-2 text-sm text-forest-700 dark:text-forest-100">
                    <input
                      type="checkbox"
                      checked={includeWords}
                      disabled={!detected.words?.length}
                      onChange={(e) => setIncludeWords(e.target.checked)}
                      className="h-4 w-4 rounded border-forest-300 text-forest-600 focus:ring-forest-500"
                    />
                    Vocabulary
                    {detected.words
                      ? ` (${detected.words.length} record${detected.words.length === 1 ? "" : "s"})`
                      : " (not in this file)"}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-forest-700 dark:text-forest-100">
                    <input
                      type="checkbox"
                      checked={includeResources}
                      disabled={!detected.resources?.length}
                      onChange={(e) => setIncludeResources(e.target.checked)}
                      className="h-4 w-4 rounded border-forest-300 text-forest-600 focus:ring-forest-500"
                    />
                    Resources
                    {detected.resources
                      ? ` (${detected.resources.length} record${detected.resources.length === 1 ? "" : "s"})`
                      : " (not in this file)"}
                  </label>
                </div>
              )}

              {phase === "done" && summary && (
                <div className="space-y-3">
                  {summary.words && (
                    <ResultBlock title="Vocabulary" result={summary.words} />
                  )}
                  {summary.resources && (
                    <ResultBlock title="Resources" result={summary.resources} />
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 shrink-0">
              <button
                type="button"
                onClick={handleClose}
                className="text-forest-600 dark:text-forest-200 hover:text-forest-800 dark:hover:text-forest-100 transition-colors"
              >
                {phase === "done" ? "Close" : "Cancel"}
              </button>
              {phase !== "done" && (
                <button
                  type="button"
                  onClick={handleStartImport}
                  disabled={!canStart}
                  className="bg-forest-600 hover:bg-forest-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {phase === "importing" ? "Importing…" : "Start Import"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
