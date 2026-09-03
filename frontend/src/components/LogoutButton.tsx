// frontend/src/components/LogoutButton.tsx
"use client";

import { clearToken } from "@/lib/apiClient";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 border border-forest-300 dark:border-forest-600 text-forest-700 dark:text-forest-100 px-4 py-2 rounded-lg hover:bg-forest-50 dark:hover:bg-forest-800 transition-colors"
    >
      <LogOut className="w-5 h-5" /> Log Out
    </button>
  );
}
