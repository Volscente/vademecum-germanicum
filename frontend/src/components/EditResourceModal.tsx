import { deleteResource, updateResource } from "@/lib/api";
import { ResourceFormValues, resourceSchema } from "@/lib/resourceSchema";
import { Resource } from "@/types/resource";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

interface EditResourceModalProps {
  resource: Resource;
  isOpen: boolean;
  onClose: () => void;
  onResourceDeleted: () => void;
  onResourceUpdated: () => void;
}

function buildDefaultValues(resource: Resource): ResourceFormValues {
  return {
    name: resource.name,
    resource_type: resource.resource_type,
    url: resource.url,
    description: resource.description ?? "",
    category: resource.category,
  };
}

const inputClass =
  "text-forest-800 dark:text-forest-100 dark:bg-forest-900 border border-forest-300 dark:border-forest-600 w-full p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 dark:focus:ring-forest-400";

const labelClass = "text-forest-700 dark:text-forest-100 block text-sm font-medium";

export default function EditResourceModal({
  resource,
  isOpen,
  onClose,
  onResourceDeleted,
  onResourceUpdated,
}: EditResourceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues: buildDefaultValues(resource),
  });

  useEffect(() => {
    reset(buildDefaultValues(resource));
  }, [resource, reset]);

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
    if (!confirm(`Are you sure you want to delete "${resource.name}"?`)) return;

    try {
      await deleteResource(resource.id);
      onResourceDeleted();
      onClose();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const onSubmit = async (data: ResourceFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await updateResource(resource.id, data);
      onResourceUpdated();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-forest-800 p-6 rounded-xl shadow-sm w-full max-w-lg max-h-[90vh] flex flex-col">
        <h2 className="text-forest-700 dark:text-forest-200 text-xl font-bold mb-4 shrink-0">
          Edit Resource
        </h2>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="space-y-4 overflow-y-auto flex-1 pr-1 pb-4">
            <div>
              <label className={labelClass}>Name</label>
              <input {...register("name")} className={inputClass} />
              {errors.name && (
                <p className="text-red-500 text-xs">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Type</label>
              <select {...register("resource_type")} className={inputClass}>
                <option value="youtube">YouTube</option>
                <option value="blog">Blog</option>
                <option value="newspaper">Newspaper</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>URL</label>
              <input {...register("url")} type="url" className={inputClass} />
              {errors.url && (
                <p className="text-red-500 text-xs">{errors.url.message}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea {...register("description")} className={inputClass} rows={3} />
            </div>

            <div>
              <label className={labelClass}>Category</label>
              <select {...register("category")} className={inputClass}>
                <option value="news">News</option>
                <option value="politics">Politics</option>
                <option value="science">Science</option>
                <option value="culture_lifestyle">Culture & Lifestyle</option>
              </select>
            </div>

            {submitError && (
              <p className="text-red-500 text-sm">{submitError}</p>
            )}
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 border-t border-forest-200 dark:border-forest-600 bg-white dark:bg-forest-800 pt-4 flex justify-between items-center shrink-0">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" /> Delete Resource
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
