import { WordFormValues } from "@/lib/wordSchema";
import { PlusCircle, Trash2 } from "lucide-react";
import { Control, FieldErrors, UseFormRegister, useFieldArray } from "react-hook-form";

interface ExampleSentenceFieldsProps {
  senseIndex: number;
  control: Control<WordFormValues>;
  errors: FieldErrors<WordFormValues>;
  register: UseFormRegister<WordFormValues>;
}

const inputClass =
  "text-forest-800 dark:text-forest-100 dark:bg-forest-900 border border-forest-300 dark:border-forest-600 w-full p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 dark:focus:ring-forest-400";

const subLabelClass = "text-xs text-forest-500 dark:text-forest-400 mb-1";

/**
 * Nested field array for the example sentences of a single sense.
 *
 * Renders one card per example sentence with clearly labelled German and
 * English inputs, a Remove button (disabled when only one row remains, to
 * honour the `min(1)` constraint in `senseSchema`) and an Add button. Must be
 * rendered as a component, not called inside a `.map()` callback, because it
 * calls `useFieldArray` internally.
 *
 * Parameters
 * ----------
 * senseIndex : number
 *     Index of the parent sense inside the `senses` field array.
 * control : Control<WordFormValues>
 *     react-hook-form control object of the parent form.
 * errors : FieldErrors<WordFormValues>
 *     Form errors of the parent form, used to show per-field messages.
 * register : UseFormRegister<WordFormValues>
 *     react-hook-form register function of the parent form.
 */
export default function ExampleSentenceFields({
  senseIndex,
  control,
  errors,
  register,
}: ExampleSentenceFieldsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `senses.${senseIndex}.example_sentences`,
  });

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-forest-600 dark:text-forest-300 mb-1">
        Example Sentences
      </p>
      {fields.map((exField, exIdx) => {
        const rowErrors = errors.senses?.[senseIndex]?.example_sentences?.[exIdx];
        return (
          <div
            key={exField.id}
            className="border border-forest-200 dark:border-forest-600 rounded-md p-2 mt-1 space-y-2"
          >
            <div className="flex gap-2 items-start">
              <div className="flex-1 space-y-2">
                <div>
                  <p className={subLabelClass}>German</p>
                  <input
                    {...register(
                      `senses.${senseIndex}.example_sentences.${exIdx}.german`,
                    )}
                    placeholder="German sentence"
                    className={inputClass}
                  />
                  {rowErrors?.german && (
                    <p className="text-red-500 text-xs">{rowErrors.german.message}</p>
                  )}
                </div>
                <div>
                  <p className={subLabelClass}>English</p>
                  <input
                    {...register(
                      `senses.${senseIndex}.example_sentences.${exIdx}.english`,
                    )}
                    placeholder="English translation"
                    className={inputClass}
                  />
                  {rowErrors?.english && (
                    <p className="text-red-500 text-xs">{rowErrors.english.message}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(exIdx)}
                disabled={fields.length === 1}
                className="text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 mt-1"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => append({ german: "", english: "" })}
        className="text-xs text-forest-600 dark:text-forest-300 hover:text-forest-800 dark:hover:text-forest-100 flex items-center gap-1 mt-1"
      >
        <PlusCircle className="w-3 h-3" /> Add Example Sentence
      </button>
    </div>
  );
}
