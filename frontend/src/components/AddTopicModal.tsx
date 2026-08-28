import { TopicFormValues, topicSchema } from "@/lib/resourceSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

interface AddTopicModalProps {
  onTopicAdded: () => void;
}

const defaultValues: TopicFormValues = { label: "" };

const inputClass =
  "text-forest-800 dark:text-forest-100 dark:bg-forest-900 border border-forest-300 dark:border-forest-600 w-full p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 dark:focus:ring-forest-400";

const labelClass = "text-forest-700 dark:text-forest-100 block text-sm font-medium";

export default function AddTopicModal({ onTopicAdded }: AddTopicModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<TopicFormValues>({
    resolver: zodResolver(topicSchema),
    defaultValues,
  });

  const onSubmit = async (data: TopicFormValues) => {
    try {
      const response = await fetch("http://localhost:8000/topics/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.status === 409) {
        setError("label", { message: "This topic already exists." });
        return;
      }

      if (response.ok) {
        reset(defaultValues);
        setIsOpen(false);
        onTopicAdded();
      }
    } catch (error) {
      console.error("Failed to add topic:", error);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-forest-600 text-white px-4 py-2 rounded-lg hover:bg-forest-700 transition-colors"
      >
        <PlusCircle className="w-5 h-5" /> Add Topic
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-forest-800 p-6 rounded-xl shadow-sm w-full max-w-sm flex flex-col">
            <h2 className="text-forest-800 dark:text-forest-100 text-xl font-bold mb-4 shrink-0">
              Add Topic
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className={labelClass}>Label</label>
                <input {...register("label")} className={inputClass} />
                {errors.label && (
                  <p className="text-red-500 text-xs">{errors.label.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
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
                  Save Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
