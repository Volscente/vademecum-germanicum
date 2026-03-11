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
        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <PlusCircle className="w-5 h-5" /> Add New Word
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add German Word</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">German Word</label>
                <input
                  {...register("word")}
                  className="w-full border p-2 rounded"
                />
                {errors.word && (
                  <p className="text-red-500 text-xs">{errors.word.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium">Translation</label>
                <input
                  {...register("translation")}
                  className="w-full border p-2 rounded"
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
                  className="text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-2 rounded"
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
