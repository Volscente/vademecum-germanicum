// frontend/src/lib/exportImport.ts
// Pure export/import logic for backing up and restoring Vocabulary + Resources.
import { apiFetch } from "@/lib/apiClient";
import { ResourceFormValues, resourceSchema } from "@/lib/resourceSchema";
import { Resource } from "@/types/resource";
import { Word } from "@/types/word";
import Papa from "papaparse";
import { z } from "zod";

export const WORDS_CSV_HEADERS = [
  "id",
  "word",
  "gender",
  "word_nominative",
  "word_genitive",
  "word_plural",
  "translation",
  "category",
  "auxiliary_verb",
  "principal_forms",
  "senses",
  "created_at",
] as const;

export const RESOURCES_CSV_HEADERS = [
  "id",
  "name",
  "resource_type",
  "url",
  "description",
  "category",
  "created_at",
] as const;

// --- Import validation --------------------------------------------------
// A superset of wordSchema.ts's senseSchema/wordSchema: it also accepts
// word_nominative/word_genitive (present in the backend's WordCreate but never
// set by the Add/Edit word forms) and each sense's difficulty_level/last_reviewed_at,
// so restoring a backup preserves review progress instead of resetting it.

const importGrammarPatternSchema = z.object({
  preposition: z.string().nullable().optional(),
  case: z.enum(["Nominativ", "Akkusativ", "Dativ", "Genitiv"]),
});

const importExampleSentenceSchema = z.object({
  german: z.string().min(1, "German sentence is required"),
  english: z.string().min(1, "English translation is required"),
});

const importSenseSchema = z.object({
  meaning_summary: z.string().min(1, "Meaning summary is required"),
  register: z.enum(["Formal", "Colloquial", "Neutral", "Technical"]),
  difficulty_level: z
    .enum(["Easy", "Medium", "Hard", "VeryHard"])
    .nullable()
    .optional(),
  last_reviewed_at: z.string().nullable().optional(),
  grammar_patterns: z.array(importGrammarPatternSchema).min(1),
  example_sentences: z.array(importExampleSentenceSchema).min(1),
});

const importWordSchema = z.object({
  word: z.string().min(1, "German word is required"),
  translation: z.string().min(1, "Translation is required"),
  gender: z.enum(["der", "die", "das", "none"]).optional(),
  category: z.enum(["noun", "verb", "adjective", "adverb", "pronoun"]).optional(),
  word_nominative: z.string().nullable().optional(),
  word_genitive: z.string().nullable().optional(),
  word_plural: z.string().nullable().optional(),
  auxiliary_verb: z.string().nullable().optional(),
  principal_forms: z.array(z.string()).nullable().optional(),
  senses: z.array(importSenseSchema).min(1, "At least one sense is required"),
});

export type WordImportPayload = z.infer<typeof importWordSchema>;

export interface SanitizeResult<T> {
  data?: T;
  error?: string;
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`)
    .join("; ");
}

export function sanitizeWordForImport(
  raw: unknown,
): SanitizeResult<WordImportPayload> {
  const result = importWordSchema.safeParse(raw);
  if (!result.success) return { error: formatZodError(result.error) };
  return { data: result.data };
}

export function sanitizeResourceForImport(
  raw: unknown,
): SanitizeResult<ResourceFormValues> {
  const result = resourceSchema.safeParse(raw);
  if (!result.success) return { error: formatZodError(result.error) };
  return { data: result.data };
}

// --- CSV row <-> record conversion --------------------------------------

export function wordToCsvRow(word: Word): Record<string, string> {
  return {
    id: String(word.id),
    word: word.word,
    gender: word.gender ?? "",
    word_nominative: word.word_nominative ?? "",
    word_genitive: word.word_genitive ?? "",
    word_plural: word.word_plural ?? "",
    translation: word.translation,
    category: word.category ?? "",
    auxiliary_verb: word.auxiliary_verb ?? "",
    principal_forms: word.principal_forms
      ? JSON.stringify(word.principal_forms)
      : "",
    senses: JSON.stringify(word.senses),
    created_at: word.created_at,
  };
}

export function csvRowToWord(
  row: Record<string, string>,
): SanitizeResult<WordImportPayload> {
  let principalForms: unknown;
  let senses: unknown;

  try {
    principalForms = row.principal_forms ? JSON.parse(row.principal_forms) : undefined;
  } catch {
    return { error: "invalid principal_forms JSON" };
  }

  try {
    senses = row.senses ? JSON.parse(row.senses) : [];
  } catch {
    return { error: "invalid senses JSON" };
  }

  return sanitizeWordForImport({
    word: row.word,
    translation: row.translation,
    gender: row.gender || undefined,
    category: row.category || undefined,
    word_nominative: row.word_nominative || undefined,
    word_genitive: row.word_genitive || undefined,
    word_plural: row.word_plural || undefined,
    auxiliary_verb: row.auxiliary_verb || undefined,
    principal_forms: principalForms,
    senses,
  });
}

export function resourceToCsvRow(resource: Resource): Record<string, string> {
  return {
    id: String(resource.id),
    name: resource.name,
    resource_type: resource.resource_type,
    url: resource.url,
    description: resource.description ?? "",
    category: resource.category,
    created_at: resource.created_at,
  };
}

export function csvRowToResource(
  row: Record<string, string>,
): SanitizeResult<ResourceFormValues> {
  return sanitizeResourceForImport({
    name: row.name,
    resource_type: row.resource_type,
    url: row.url,
    description: row.description || undefined,
    category: row.category,
  });
}

// --- Export builders ------------------------------------------------------

export function buildWordsCsv(words: Word[]): string {
  return Papa.unparse({
    fields: [...WORDS_CSV_HEADERS],
    data: words.map(wordToCsvRow),
  });
}

export function buildResourcesCsv(resources: Resource[]): string {
  return Papa.unparse({
    fields: [...RESOURCES_CSV_HEADERS],
    data: resources.map(resourceToCsvRow),
  });
}

export interface ExportBundle {
  words: Word[];
  resources: Resource[];
}

export function buildExportJson(words: Word[], resources: Resource[]): ExportBundle {
  return { words, resources };
}

export function downloadBlob(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function fetchAllWords(): Promise<Word[]> {
  const response = await apiFetch("/words/?limit=100000");
  return response.json();
}

export async function fetchAllResources(): Promise<Resource[]> {
  const response = await apiFetch("/resources/?limit=100000");
  return response.json();
}

// --- Import file-kind detection --------------------------------------------

export type FileKind = "json" | "words-csv" | "resources-csv" | "unknown";

export interface DetectedFile {
  kind: FileKind;
  words?: unknown[];
  resources?: unknown[];
}

export function detectFileKind(text: string): DetectedFile {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (Array.isArray(parsed.words) || Array.isArray(parsed.resources)) {
        return {
          kind: "json",
          words: Array.isArray(parsed.words) ? parsed.words : undefined,
          resources: Array.isArray(parsed.resources) ? parsed.resources : undefined,
        };
      }
    } catch {
      // Not valid JSON — fall through to CSV detection.
    }
  }

  const { data } = Papa.parse<Record<string, string>>(trimmed, {
    header: true,
    skipEmptyLines: true,
  });
  const headerSet = new Set(data.length > 0 ? Object.keys(data[0]) : []);

  if (WORDS_CSV_HEADERS.every((h) => headerSet.has(h))) {
    return { kind: "words-csv", words: data };
  }
  if (RESOURCES_CSV_HEADERS.every((h) => headerSet.has(h))) {
    return { kind: "resources-csv", resources: data };
  }
  return { kind: "unknown" };
}

// --- Per-record import (create + classify) ---------------------------------

export type ImportOutcome = "added" | "duplicate" | "failed";

export interface ImportResult {
  outcome: ImportOutcome;
  reason?: string;
}

async function parseErrorDetail(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      const messages = body.detail
        .map((d: { msg?: string }) => d.msg)
        .filter(Boolean);
      if (messages.length > 0) return messages.join("; ");
    }
  } catch {
    // Body wasn't JSON — fall back to the status text below.
  }
  return response.statusText || `HTTP ${response.status}`;
}

async function postForImport(
  path: string,
  payload: unknown,
): Promise<ImportResult> {
  try {
    const response = await apiFetch(path, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (response.ok) return { outcome: "added" };
    if (response.status === 409) return { outcome: "duplicate" };
    return { outcome: "failed", reason: await parseErrorDetail(response) };
  } catch (error) {
    return {
      outcome: "failed",
      reason: error instanceof Error ? error.message : "Network error",
    };
  }
}

export function importWordRecord(payload: WordImportPayload): Promise<ImportResult> {
  return postForImport("/words/", payload);
}

export function importResourceRecord(
  payload: ResourceFormValues,
): Promise<ImportResult> {
  return postForImport("/resources/", payload);
}
