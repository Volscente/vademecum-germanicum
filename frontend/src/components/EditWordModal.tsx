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
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
        <h2 className="text-gray-500 text-xl font-bold mb-4">Word Details</h2>

        <div className="space-y-2 mb-6">
          <p>
            <strong className="text-gray-600">German:</strong> {word.word}{" "}
            {word.gender !== "none" && `(${word.gender})`}
          </p>
          <p>
            <strong className="text-gray-600">Translation:</strong>{" "}
            {word.translation}
          </p>
          <p>
            <strong className="text-gray-600">Category:</strong> {word.category}
          </p>
        </div>

        <div className="flex justify-between items-center mt-6">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete Word
          </button>

          <button
            onClick={onClose}
            className="bg-gray-200 px-4 py-2 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
