import { Search, X } from "lucide-react"; // Requires lucide-react
import { useEffect, useState } from "react";

interface SearchBarProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  delay?: number;
}

export default function SearchBar({
  onSearch,
  placeholder = "Search...",
  delay = 300,
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState("");

  // 1. Debounce Logic
  useEffect(() => {
    // Set a timer to trigger the search after the delay
    const timer = setTimeout(() => {
      onSearch(inputValue);
    }, delay);

    // 2. Cleanup: If the user types again before 'delay' ms, cancel the previous timer
    return () => clearTimeout(timer);
  }, [inputValue, delay, onSearch]);

  return (
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-forest-400 dark:text-forest-500 group-focus-within:text-forest-600 dark:group-focus-within:text-forest-400 transition-colors" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-10 py-2.5 border border-forest-200 dark:border-forest-700 rounded-lg bg-white dark:bg-forest-900 placeholder-forest-400 dark:placeholder-forest-500 text-forest-900 dark:text-forest-100 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all shadow-sm"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      {inputValue && (
        <button
          onClick={() => setInputValue("")}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-forest-400 hover:text-forest-600 dark:text-forest-500 dark:hover:text-forest-300"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
