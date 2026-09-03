import { apiFetch } from "@/lib/apiClient";
import { ResourceFormValues, resourceSchema } from "@/lib/resourceSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

interface AddResourceModalProps {
  onResourceAdded: () => void;
}

const defaultValues: ResourceFormValues = {
  name: "",
  resource_type: "youtube",
  url: "",
  description: "",
  category: "news",
};

const inputClass =
  "text-forest-800 dark:text-forest-100 dark:bg-forest-900 border border-forest-300 dark:border-forest-600 w-full p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 dark:focus:ring-forest-400";

const labelClass = "text-forest-700 dark:text-forest-100 block text-sm font-medium";

export default function AddResourceModal({
  onResourceAdded,
}: AddResourceModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues,
  });

  const onSubmit = async (data: ResourceFormValues) => {
    try {
      const response = await apiFetch("/resources/", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (response.status === 409) {
        setError("url", {
          message: "A resource with this URL already exists.",
        });
        return;
      }

      if (response.ok) {
        reset(defaultValues);
        setIsOpen(false);
        onResourceAdded();
      }
    } catch (error) {
      console.error("Failed to add resource:", error);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-forest-600 text-white px-4 py-2 rounded-lg hover:bg-forest-700 transition-colors"
      >
        <PlusCircle className="w-5 h-5" /> Add Resource
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-forest-800 p-6 rounded-xl shadow-sm w-full max-w-lg max-h-[90vh] flex flex-col">
            <h2 className="text-forest-800 dark:text-forest-100 text-xl font-bold mb-4 shrink-0">
              Add Resource
            </h2>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4 overflow-y-auto flex-1 pr-1"
            >
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
                <input
                  {...register("url")}
                  type="url"
                  className={inputClass}
                />
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
                  Save Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
