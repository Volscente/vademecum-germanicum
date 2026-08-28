// frontend/src/components/ResourceTable.tsx
import { Resource } from "@/types/resource";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Clock,
  Newspaper,
  Rss,
  Youtube,
} from "lucide-react";
import { useMemo, useState } from "react";
import EditResourceModal from "./EditResourceModal";

type SortKey = "name" | "resource_type" | "category" | "created_at";
type SortDir = "asc" | "desc";

function SortIcon({
  col,
  sortKey,
  sortDir,
}: {
  col: SortKey;
  sortKey: SortKey | null;
  sortDir: SortDir;
}) {
  if (sortKey !== col)
    return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />;
  return sortDir === "asc" ? (
    <ChevronUp className="w-3.5 h-3.5" />
  ) : (
    <ChevronDown className="w-3.5 h-3.5" />
  );
}

function resourceTypeIcon(type: Resource["resource_type"]) {
  if (type === "youtube") return <Youtube className="w-4 h-4" />;
  if (type === "blog") return <Rss className="w-4 h-4" />;
  return <Newspaper className="w-4 h-4" />;
}

function categoryLabel(category: Resource["category"]) {
  return category === "culture_lifestyle" ? "Culture & Lifestyle" : category;
}

interface ResourceTableProps {
  resources: Resource[];
  onRefresh: () => void;
}

export default function ResourceTable({
  resources,
  onRefresh,
}: ResourceTableProps) {
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null,
  );
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return resources;
    return [...resources].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [resources, sortKey, sortDir]);

  return (
    <>
      <div className="overflow-hidden shadow ring-1 ring-forest-900/10 dark:ring-forest-100/10 sm:rounded-lg">
        <table className="min-w-full divide-y divide-forest-200 dark:divide-forest-700">
          <thead className="bg-forest-50 dark:bg-forest-800">
            <tr>
              <th
                onClick={() => handleSort("name")}
                className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-forest-900 dark:text-forest-100 cursor-pointer select-none hover:text-forest-600 dark:hover:text-forest-300"
              >
                <div className="flex items-center gap-2">
                  Name <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
                </div>
              </th>
              <th
                onClick={() => handleSort("resource_type")}
                className="px-3 py-3.5 text-left text-sm font-semibold text-forest-900 dark:text-forest-100 cursor-pointer select-none hover:text-forest-600 dark:hover:text-forest-300"
              >
                <div className="flex items-center gap-2">
                  Type{" "}
                  <SortIcon
                    col="resource_type"
                    sortKey={sortKey}
                    sortDir={sortDir}
                  />
                </div>
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-forest-900 dark:text-forest-100">
                Description
              </th>
              <th
                onClick={() => handleSort("category")}
                className="px-3 py-3.5 text-left text-sm font-semibold text-forest-900 dark:text-forest-100 cursor-pointer select-none hover:text-forest-600 dark:hover:text-forest-300"
              >
                <div className="flex items-center gap-2">
                  Category{" "}
                  <SortIcon
                    col="category"
                    sortKey={sortKey}
                    sortDir={sortDir}
                  />
                </div>
              </th>
              <th
                onClick={() => handleSort("created_at")}
                className="px-3 py-3.5 text-left text-sm font-semibold text-forest-900 dark:text-forest-100 cursor-pointer select-none hover:text-forest-600 dark:hover:text-forest-300"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Added{" "}
                  <SortIcon
                    col="created_at"
                    sortKey={sortKey}
                    sortDir={sortDir}
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-forest-100 dark:divide-forest-700 bg-white dark:bg-forest-900">
            {sorted.map((resource) => (
              <tr
                key={resource.id}
                onClick={() => setSelectedResource(resource)}
                className="hover:bg-forest-50 dark:hover:bg-forest-800 cursor-pointer transition-colors"
              >
                <td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm">
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 font-bold text-forest-700 dark:text-forest-200 underline hover:text-forest-900 dark:hover:text-forest-50"
                  >
                    {resourceTypeIcon(resource.resource_type)}
                    {resource.name}
                  </a>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-sm text-forest-600 dark:text-forest-200 capitalize">
                  {resource.resource_type}
                </td>
                <td className="px-3 py-3 text-sm text-forest-600 dark:text-forest-200 max-w-xs truncate">
                  {resource.description || "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-sm">
                  <span className="inline-flex items-center rounded-md bg-forest-50 dark:bg-forest-700 px-2 py-1 text-xs font-medium text-forest-700 dark:text-forest-100 ring-1 ring-inset ring-forest-700/10 dark:ring-forest-300/20">
                    {categoryLabel(resource.category)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-sm text-forest-400 dark:text-forest-400">
                  {new Date(resource.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedResource && (
        <EditResourceModal
          resource={selectedResource}
          isOpen={!!selectedResource}
          onClose={() => setSelectedResource(null)}
          onResourceDeleted={onRefresh}
          onResourceUpdated={onRefresh}
        />
      )}
    </>
  );
}
