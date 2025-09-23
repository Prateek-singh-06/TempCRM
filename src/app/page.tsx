"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page on initial load
    // In a real app, this would check for authentication first
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center animate-pulse">
            <TrendingUp className="h-10 w-10 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
          CRM Pro
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
