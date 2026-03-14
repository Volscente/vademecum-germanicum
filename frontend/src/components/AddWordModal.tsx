import { WordFormValues, wordSchema } from "@/lib/wordSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

// Properties how page.tsx talks to AddWordModal
interface AddWordModalProps {
  onWordAdded: () => void; // Callback to refresh the table
}

export default function AddWordModal({ onWordAdded }: AddWordModalProps) {
  // Controls whether to show AddWord UI form (initially set to False -> Not show)
  const [isOpen, setIsOpen] = useState(false);

  // Reach Hook Form
  const {
    register, // Register input data and apply validation
    handleSubmit, // Receive form data after validation
    reset, // Clear form
    formState: { errors },
  } = useForm<WordFormValues>({
    resolver: zodResolver(wordSchema), // Schema validation
    defaultValues: { gender: "none", category: "noun" },
  });

  const onSubmit = async (data: WordFormValues) => {
    try {
      const response = await fetch("http://localhost:8000/words/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        reset(); // Clear form
        setIsOpen(false); // Close the UI form upon submitting new word to be added
        onWordAdded(); // Trigger table refresh
      }
    } catch (error) {
      console.error("Failed to add word:", error);
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
          <div className="bg-white dark:bg-forest-800 p-6 rounded-xl shadow-xl w-full max-w-md">
            <h2 className="text-forest-800 dark:text-forest-100 text-xl font-bold mb-4">
              Add German Word
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-forest-700 dark:text-forest-200 block text-sm font-medium">
                  German Word
                </label>
                <input
                  {...register("word")}
                  className="text-forest-800 dark:text-forest-100 dark:bg-forest-900 border border-forest-300 dark:border-forest-600 w-full p-2 rounded focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
                {errors.word && (
                  <p className="text-red-600 text-xs">{errors.word.message}</p>
                )}
              </div>

              <div>
                <label className="text-forest-700 dark:text-forest-200 block text-sm font-medium">
                  Translation
                </label>
                <input
                  {...register("translation")}
                  className="text-forest-800 dark:text-forest-100 dark:bg-forest-900 border border-forest-300 dark:border-forest-600 w-full p-2 rounded focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
                {errors.translation && (
                  <p className="text-red-500 text-xs">
                    {errors.translation.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-forest-600 dark:text-forest-300 hover:text-forest-800 dark:hover:text-forest-100 transition-colors"
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
