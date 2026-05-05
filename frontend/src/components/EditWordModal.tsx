// frontend/src/components/EditWordModal.tsx
import { Word } from "@/types/word";
import { Trash2 } from "lucide-react";

// Props for WordTable.tsx to interact with EditWordModel Component
interface EditWordModalProps {
  word: Word;
  isOpen: boolean;
  onClose: () => void;
  onWordDeleted: () => void;
}

export default function EditWordModal({
  word,
  isOpen,
  onClose,
  onWordDeleted,
}: EditWordModalProps) {
  if (!isOpen) return null;

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${word.word}"?`)) return;

    try {
      const response = await fetch(`http://localhost:8000/words/${word.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onWordDeleted(); // Refresh the table
        onClose(); // Close the modal
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-forest-800 p-6 rounded-xl shadow-xl w-full max-w-md">
        <h2 className="text-forest-700 dark:text-forest-200 text-xl font-bold mb-4">
          Word Details
        </h2>

        <div className="space-y-2 mb-6">
          <p>
            <strong className="text-forest-700 dark:text-forest-300">
              German:
            </strong>{" "}
            <span className="text-forest-900 dark:text-forest-100">
              {word.word}
            </span>{" "}
            {word.gender !== "none" && (
              <span className="text-forest-500 dark:text-forest-400 text-xs uppercase">
                ({word.gender})
              </span>
            )}
          </p>
          <p>
            <strong className="text-forest-700 dark:text-forest-300">
              Translation:
            </strong>{" "}
            <span className="text-forest-900 dark:text-forest-100">
              {word.translation}
            </span>
          </p>
          <p>
            <strong className="text-forest-700 dark:text-forest-300">
              Category:
            </strong>{" "}
            <span className="text-forest-900 dark:text-forest-100">
              {word.category}
            </span>
          </p>
        </div>

        <div className="flex justify-between items-center mt-6">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete Word
          </button>

          <button
            onClick={onClose}
            className="bg-forest-100 dark:bg-forest-700 text-forest-800 dark:text-forest-100 hover:bg-forest-200 dark:hover:bg-forest-600 px-4 py-2 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
