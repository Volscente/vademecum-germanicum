import { WordFormValues } from "@/lib/wordSchema";
import { PlusCircle, Trash2 } from "lucide-react";
import { Control, FieldErrors, UseFormRegister, useFieldArray } from "react-hook-form";

interface GrammarPatternFieldsProps {
  senseIndex: number;
  control: Control<WordFormValues>;
  errors: FieldErrors<WordFormValues>;
  register: UseFormRegister<WordFormValues>;
}

const inputClass =
  "text-forest-800 dark:text-forest-100 dark:bg-forest-900 border border-forest-300 dark:border-forest-600 w-full p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 dark:focus:ring-forest-400";

export default function GrammarPatternFields({
  senseIndex,
  control,
  errors,
  register,
}: GrammarPatternFieldsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `senses.${senseIndex}.grammar_patterns`,
  });

  return (
    <div className="space-y-1">
      {fields.map((gpField, gpIdx) => (
        <div key={gpField.id} className="flex gap-2 items-center mt-1">
          <input
            {...register(`senses.${senseIndex}.grammar_patterns.${gpIdx}.preposition`)}
            placeholder="Preposition (optional)"
            className={inputClass}
          />
          <select
            {...register(`senses.${senseIndex}.grammar_patterns.${gpIdx}.case`)}
            className={inputClass}
          >
            <option value="Akkusativ">Akkusativ</option>
            <option value="Dativ">Dativ</option>
            <option value="Nominativ">Nominativ</option>
            <option value="Genitiv">Genitiv</option>
          </select>
          <button
            type="button"
            onClick={() => remove(gpIdx)}
            disabled={fields.length === 1}
            className="text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
      {errors.senses?.[senseIndex]?.grammar_patterns &&
        !Array.isArray(errors.senses[senseIndex].grammar_patterns) && (
          <p className="text-red-500 text-xs">
            {(errors.senses[senseIndex].grammar_patterns as { message?: string })?.message}
          </p>
        )}
      <button
        type="button"
        onClick={() => append({ preposition: null, case: "Akkusativ" })}
        className="text-xs text-forest-600 dark:text-forest-300 hover:text-forest-800 dark:hover:text-forest-100 flex items-center gap-1 mt-1"
      >
        <PlusCircle className="w-3 h-3" /> Add Grammar Pattern
      </button>
    </div>
  );
}
