import { enrichWord, updateWord } from "@/lib/api";
import { WordFormValues, wordSchema } from "@/lib/wordSchema";
import { Word } from "@/types/word";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

interface EditWordModalProps {
  word: Word;
  isOpen: boolean;
  onClose: () => void;
  onWordDeleted: () => void;
  onWordUpdated: () => void;
}

function buildDefaultValues(word: Word): WordFormValues {
  return {
    word: word.word,
    translation: word.translation,
    gender: (word.gender as WordFormValues["gender"]) ?? "none",
    category: (word.category as WordFormValues["category"]) ?? "noun",
    word_plural: word.word_plural ?? undefined,
    auxiliary_verb: word.auxiliary_verb ?? undefined,
    principal_forms: word.principal_forms ?? undefined,
    senses: word.senses.map((s) => ({
      meaning_summary: s.meaning_summary,
      register: s.register,
      grammar_patterns: s.grammar_patterns.map((gp) => ({
        preposition: gp.preposition,
        case: gp.case,
      })),
      example_sentences: s.example_sentences.map((ex) => ({
        german: ex.german,
        english: ex.english,
      })),
    })),
  };
}

const emptySense: WordFormValues["senses"][number] = {
  meaning_summary: "",
  register: "Neutral",
  grammar_patterns: [{ preposition: null, case: "Akkusativ" }],
  example_sentences: [{ german: "", english: "" }],
};

const inputClass =
  "text-forest-800 dark:text-forest-100 dark:bg-forest-900 border border-forest-300 dark:border-forest-600 w-full p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 dark:focus:ring-forest-400";

const labelClass = "text-forest-700 dark:text-forest-100 block text-sm font-medium";

export default function EditWordModal({
  word,
  isOpen,
  onClose,
  onWordDeleted,
  onWordUpdated,
}: EditWordModalProps) {
  // All hooks must be declared before any early return
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    watch,
    control,
    formState: { errors },
  } = useForm<WordFormValues>({
    resolver: zodResolver(wordSchema),
    defaultValues: buildDefaultValues(word),
  });

  const { fields: senseFields, append, remove } = useFieldArray({
    control,
    name: "senses",
  });

  // Reset form whenever the selected word changes
  useEffect(() => {
    reset(buildDefaultValues(word));
  }, [word, reset]);

  const watchedSenses = watch("senses") ?? [];
  const watchedCategory = watch("category");

  // Guard comes after all hooks
  if (!isOpen) return null;

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${word.word}"?`)) return;

    try {
      const response = await fetch(`http://localhost:8000/words/${word.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onWordDeleted();
        onClose();
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const onSubmit = async (data: WordFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await updateWord(word.id, data);
      onWordUpdated();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onReEnrich = async () => {
    const currentWord = getValues("word");
    setIsEnriching(true);
    setEnrichError(null);
    try {
      const enriched = await enrichWord(currentWord);
      reset({
        word: currentWord,
        translation: enriched.translation,
        gender: enriched.gender,
        category: enriched.category,
        word_plural: enriched.word_plural ?? undefined,
        auxiliary_verb: enriched.auxiliary_verb ?? undefined,
        principal_forms: enriched.principal_forms ?? undefined,
        senses: enriched.senses,
      });
    } catch {
      setEnrichError("Could not re-enrich word. Please try again.");
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-forest-800 p-6 rounded-xl shadow-sm w-full max-w-lg max-h-[90vh] flex flex-col">
        <h2 className="text-forest-700 dark:text-forest-200 text-xl font-bold mb-4 shrink-0">
          Edit Word
        </h2>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 overflow-y-auto flex-1 pr-1"
        >
          {/* German Word + Re-enrich */}
          <div>
            <label className={labelClass}>German Word</label>
            <div className="flex gap-2 mt-1">
              <input {...register("word")} className={inputClass} />
              <button
                type="button"
                onClick={onReEnrich}
                disabled={isEnriching || isSubmitting}
                className="flex items-center gap-1 px-3 py-2 rounded bg-forest-100 dark:bg-forest-700 text-forest-700 dark:text-forest-200 hover:bg-forest-200 dark:hover:bg-forest-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap text-xs"
              >
                <RefreshCw className="w-3 h-3" />
                {isEnriching ? "Enriching…" : "Re-enrich (replaces senses)"}
              </button>
            </div>
            {errors.word && (
              <p className="text-red-600 text-xs mt-1">{errors.word.message}</p>
            )}
            {enrichError && (
              <p className="text-red-500 text-xs mt-1">{enrichError}</p>
            )}
          </div>

          {/* Translation */}
          <div>
            <label className={labelClass}>Translation</label>
            <input {...register("translation")} className={inputClass} />
            {errors.translation && (
              <p className="text-red-500 text-xs">{errors.translation.message}</p>
            )}
          </div>

          {/* Gender + Category */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className={labelClass}>Gender</label>
              <select {...register("gender")} className={inputClass}>
                <option value="none">none</option>
                <option value="der">der</option>
                <option value="die">die</option>
                <option value="das">das</option>
              </select>
            </div>
            <div className="flex-1">
              <label className={labelClass}>Category</label>
              <select {...register("category")} className={inputClass}>
                <option value="noun">noun</option>
                <option value="verb">verb</option>
                <option value="adjective">adjective</option>
                <option value="adverb">adverb</option>
                <option value="pronoun">pronoun</option>
              </select>
            </div>
          </div>

          {/* Plural */}
          <div>
            <label className={labelClass}>Plural</label>
            <input {...register("word_plural")} className={inputClass} />
          </div>

          {/* Verb Morphology — shown only when auxiliary_verb is set or category is verb */}
          {(watchedCategory === "verb" || word.auxiliary_verb) && (
            <div className="border border-forest-200 dark:border-forest-600 rounded-lg p-3 space-y-3">
              <p className="text-xs font-semibold text-forest-600 dark:text-forest-300 uppercase tracking-wide">
                Verb Morphology
              </p>
              <div>
                <label className={labelClass}>Auxiliary Verb</label>
                <select {...register("auxiliary_verb")} className={inputClass}>
                  <option value="">—</option>
                  <option value="haben">haben</option>
                  <option value="sein">sein</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Principal Forms</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {["Infinitiv", "Präteritum", "Partizip II"].map((label, i) => (
                    <div key={label}>
                      <p className="text-xs text-forest-500 dark:text-forest-400 mb-1">
                        {label}
                      </p>
                      <input
                        {...register(`principal_forms.${i}`)}
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Senses */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Senses</label>
              <button
                type="button"
                onClick={() => append({ ...emptySense })}
                className="text-xs text-forest-600 dark:text-forest-300 hover:text-forest-800 dark:hover:text-forest-100 flex items-center gap-1"
              >
                <PlusCircle className="w-3 h-3" /> Add Sense
              </button>
            </div>
            {errors.senses && !Array.isArray(errors.senses) && (
              <p className="text-red-500 text-xs mb-2">
                {errors.senses.message}
              </p>
            )}

            <div className="space-y-4">
              {senseFields.map((field, sIdx) => (
                <div
                  key={field.id}
                  className="border border-forest-200 dark:border-forest-600 rounded-lg p-3 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-forest-600 dark:text-forest-300 uppercase tracking-wide">
                      Sense {sIdx + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => remove(sIdx)}
                      disabled={senseFields.length === 1}
                      className="text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Meaning Summary */}
                  <div>
                    <label className={labelClass}>Meaning Summary</label>
                    <input
                      {...register(`senses.${sIdx}.meaning_summary`)}
                      className={inputClass}
                    />
                    {errors.senses?.[sIdx]?.meaning_summary && (
                      <p className="text-red-500 text-xs">
                        {errors.senses[sIdx].meaning_summary?.message}
                      </p>
                    )}
                  </div>

                  {/* Register */}
                  <div>
                    <label className={labelClass}>Register</label>
                    <select
                      {...register(`senses.${sIdx}.register`)}
                      className={inputClass}
                    >
                      <option value="Neutral">Neutral</option>
                      <option value="Formal">Formal</option>
                      <option value="Colloquial">Colloquial</option>
                      <option value="Technical">Technical</option>
                    </select>
                  </div>

                  {/* Grammar Patterns */}
                  <div>
                    <p className="text-xs font-medium text-forest-600 dark:text-forest-300 mb-1">
                      Grammar Patterns
                    </p>
                    {(watchedSenses[sIdx]?.grammar_patterns ?? []).map(
                      (_, gpIdx) => (
                        <div key={gpIdx} className="flex gap-2 mt-1">
                          <input
                            {...register(
                              `senses.${sIdx}.grammar_patterns.${gpIdx}.preposition`,
                            )}
                            placeholder="Preposition (optional)"
                            className={inputClass}
                          />
                          <select
                            {...register(
                              `senses.${sIdx}.grammar_patterns.${gpIdx}.case`,
                            )}
                            className={inputClass}
                          >
                            <option value="Akkusativ">Akkusativ</option>
                            <option value="Dativ">Dativ</option>
                            <option value="Nominativ">Nominativ</option>
                            <option value="Genitiv">Genitiv</option>
                          </select>
                        </div>
                      ),
                    )}
                  </div>

                  {/* Example Sentences */}
                  <div>
                    <p className="text-xs font-medium text-forest-600 dark:text-forest-300 mb-1">
                      Example Sentences
                    </p>
                    {(watchedSenses[sIdx]?.example_sentences ?? []).map(
                      (_, exIdx) => (
                        <div key={exIdx} className="space-y-1 mt-1">
                          <input
                            {...register(
                              `senses.${sIdx}.example_sentences.${exIdx}.german`,
                            )}
                            placeholder="German sentence"
                            className={inputClass}
                          />
                          <input
                            {...register(
                              `senses.${sIdx}.example_sentences.${exIdx}.english`,
                            )}
                            placeholder="English translation"
                            className={inputClass}
                          />
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit error */}
          {submitError && (
            <p className="text-red-500 text-sm">{submitError}</p>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-2 shrink-0">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" /> Delete Word
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-forest-600 dark:text-forest-200 hover:text-forest-800 dark:hover:text-forest-100 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-forest-600 hover:bg-forest-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-60"
              >
                {isSubmitting ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
