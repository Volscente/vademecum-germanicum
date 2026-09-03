// frontend/src/components/ExportControl.tsx
"use client";

import {
  buildExportJson,
  buildResourcesCsv,
  buildWordsCsv,
  downloadBlob,
  fetchAllResources,
  fetchAllWords,
} from "@/lib/exportImport";
import { ChevronDown, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ExportControl() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleExport = async (format: "json" | "csv") => {
    setIsOpen(false);
    setIsExporting(true);
    try {
      const [words, resources] = await Promise.all([
        fetchAllWords(),
        fetchAllResources(),
      ]);

      if (format === "json") {
        const bundle = buildExportJson(words, resources);
        downloadBlob(
          `vademecum-export-${todayStamp()}.json`,
          JSON.stringify(bundle, null, 2),
          "application/json",
        );
      } else {
        downloadBlob(
          `vademecum-words-${todayStamp()}.csv`,
          buildWordsCsv(words),
          "text/csv",
        );
        downloadBlob(
          `vademecum-resources-${todayStamp()}.csv`,
          buildResourcesCsv(resources),
          "text/csv",
        );
      }
    } catch (error) {
      console.error("Failed to export data:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        disabled={isExporting}
        className="flex items-center gap-2 border border-forest-300 dark:border-forest-600 text-forest-700 dark:text-forest-100 px-4 py-2 rounded-lg hover:bg-forest-50 dark:hover:bg-forest-800 transition-colors disabled:opacity-50"
      >
        <Download className="w-5 h-5" />
        {isExporting ? "Exporting…" : "Export"}
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-forest-800 border border-forest-200 dark:border-forest-700 rounded-lg shadow-sm z-40 overflow-hidden">
          <button
            onClick={() => handleExport("json")}
            className="block w-full text-left px-4 py-2 text-sm text-forest-700 dark:text-forest-100 hover:bg-forest-50 dark:hover:bg-forest-700 transition-colors"
          >
            Export as JSON
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="block w-full text-left px-4 py-2 text-sm text-forest-700 dark:text-forest-100 hover:bg-forest-50 dark:hover:bg-forest-700 transition-colors"
          >
            Export as CSV
          </button>
        </div>
      )}
    </div>
  );
}
