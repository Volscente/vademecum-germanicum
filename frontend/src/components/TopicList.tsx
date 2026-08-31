// frontend/src/components/TopicList.tsx
import { Topic } from "@/types/resource";
import { Clock } from "lucide-react";
import { useState } from "react";
import EditTopicModal from "./EditTopicModal";

interface TopicListProps {
  topics: Topic[];
  onRefresh: () => void;
}

export default function TopicList({ topics, onRefresh }: TopicListProps) {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  return (
    <>
      <div className="max-h-[600px] overflow-y-auto shadow ring-1 ring-forest-900/10 dark:ring-forest-100/10 sm:rounded-lg">
        <table className="min-w-full divide-y divide-forest-200 dark:divide-forest-700">
          <thead className="sticky top-0 z-10 bg-forest-50 dark:bg-forest-800">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-forest-900 dark:text-forest-100">
                Topic
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-forest-900 dark:text-forest-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Added
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-forest-100 dark:divide-forest-700 bg-white dark:bg-forest-900">
            {topics.map((topic) => (
              <tr
                key={topic.id}
                onClick={() => setSelectedTopic(topic)}
                className="hover:bg-forest-50 dark:hover:bg-forest-800 cursor-pointer transition-colors"
              >
                <td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm font-medium text-forest-700 dark:text-forest-200">
                  {topic.label}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-sm text-forest-400 dark:text-forest-400">
                  {new Date(topic.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTopic && (
        <EditTopicModal
          topic={selectedTopic}
          isOpen={!!selectedTopic}
          onClose={() => setSelectedTopic(null)}
          onTopicDeleted={onRefresh}
          onTopicUpdated={onRefresh}
        />
      )}
    </>
  );
}
