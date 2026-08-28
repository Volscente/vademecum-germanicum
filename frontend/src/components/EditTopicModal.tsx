import { deleteTopic, updateTopic } from "@/lib/api";
import { TopicFormValues, topicSchema } from "@/lib/resourceSchema";
import { Topic } from "@/types/resource";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

interface EditTopicModalProps {
  topic: Topic;
  isOpen: boolean;
  onClose: () => void;
  onTopicDeleted: () => void;
  onTopicUpdated: () => void;
}

const inputClass =
  "text-forest-800 dark:text-forest-100 dark:bg-forest-900 border border-forest-300 dark:border-forest-600 w-full p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 dark:focus:ring-forest-400";

const labelClass = "text-forest-700 dark:text-forest-100 block text-sm font-medium";

export default function EditTopicModal({
  topic,
  isOpen,
  onClose,
  onTopicDeleted,
  onTopicUpdated,
}: EditTopicModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TopicFormValues>({
    resolver: zodResolver(topicSchema),
    defaultValues: { label: topic.label },
  });

  useEffect(() => {
    reset({ label: topic.label });
  }, [topic, reset]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${topic.label}"?`)) return;

    try {
      await deleteTopic(topic.id);
      onTopicDeleted();
      onClose();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const onSubmit = async (data: TopicFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await updateTopic(topic.id, data);
      onTopicUpdated();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-forest-800 p-6 rounded-xl shadow-sm w-full max-w-sm flex flex-col">
        <h2 className="text-forest-700 dark:text-forest-200 text-xl font-bold mb-4 shrink-0">
          Edit Topic
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className={labelClass}>Label</label>
            <input {...register("label")} className={inputClass} />
            {errors.label && (
              <p className="text-red-500 text-xs">{errors.label.message}</p>
            )}
          </div>

          {submitError && <p className="text-red-500 text-sm">{submitError}</p>}

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" /> Delete Topic
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
