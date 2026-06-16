import { enrichWord } from "@/lib/api";
import { WordFormValues, wordSchema } from "@/lib/wordSchema";
import GrammarPatternFields from "@/components/GrammarPatternFields";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

interface AddWordModalProps {
  onWordAdded: () => void;
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

export default function AddWordModal({ onWordAdded }: AddWordModalProps) {
  const [isOpen, setIsOpen] = useState(false);
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
    defaultValues: {
      gender: "none",
      category: "noun",
      senses: [{ ...emptySense }],
    },
  });

  const { fields: senseFields, append, remove } = useFieldArray({
    control,
    name: "senses",
  });

  const watchedSenses = watch("senses") ?? [];
  const watchedCategory = watch("category");
  const wordValue = watch("word");

  const onSubmit = async (data: WordFormValues) => {
    try {
      const response = await fetch("http://localhost:8000/words/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        reset({ gender: "none", category: "noun", senses: [{ ...emptySense }] });
        setIsOpen(false);
        onWordAdded();
      }
    } catch (error) {
      console.error("Failed to add word:", error);
    }
  };

  /**
   * Click handler for the "Enrich" button.
   *
   * Reads the current word input via getValues("word"), calls enrichWord,
   * and resets the entire form with the enriched data via reset().
   *
   * Returns: void — side effects: reset() call with enriched data, state updates.
   * Does not throw — errors are caught and written to enrichError state.
   */
  const onEnrich = async () => {
    const word = getValues("word");
    setIsEnriching(true);
    setEnrichError(null);
    try {
      const enriched = await enrichWord(word);
      reset({
        word,
        translation: enriched.translation,
        gender: enriched.gender,
        category: enriched.category,
        word_plural: enriched.word_plural ?? undefined,
        auxiliary_verb: enriched.auxiliary_verb ?? undefined,
        principal_forms: enriched.principal_forms ?? undefined,
        senses: enriched.senses,
      });
    } catch {
      setEnrichError("Could not enrich word. Please try again.");
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-forest-600 text-white px-4 py-2 rounded-lg hover:bg-forest-700 transition-colors"
      >
        <PlusCircle className="w-5 h-5" /> Add New Word
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-forest-800 p-6 rounded-xl shadow-sm w-full max-w-lg max-h-[90vh] flex flex-col">
            <h2 className="text-forest-800 dark:text-forest-100 text-xl font-bold mb-4 shrink-0">
              Add German Word
            </h2>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4 overflow-y-auto flex-1 pr-1"
            >
              {/* German Word + Enrich */}
              <div>
                <label className={labelClass}>German Word</label>
                <div className="flex gap-2 mt-1">
                  <input {...register("word")} className={inputClass} />
                  <button
                    type="button"
                    onClick={onEnrich}
                    disabled={!wordValue || isEnriching}
                    className="flex items-center gap-1 px-3 py-2 rounded bg-forest-100 dark:bg-forest-700 text-forest-700 dark:text-forest-200 hover:bg-forest-200 dark:hover:bg-forest-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isEnriching ? "Enriching…" : "Enrich"}
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

              {/* Verb Morphology — shown only for verbs */}
              {watchedCategory === "verb" && (
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
                      <GrammarPatternFields
                        senseIndex={sIdx}
                        control={control}
                        errors={errors}
                        register={register}
                      />

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

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-forest-600 dark:text-forest-200 hover:text-forest-800 dark:hover:text-forest-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-forest-600 hover:bg-forest-700 text-white px-4 py-2 rounded transition-colors"
                >
                  Save Word
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
