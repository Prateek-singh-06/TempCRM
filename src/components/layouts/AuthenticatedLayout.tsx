"use client";

import CRMNav from "@/components/nav/CRMNav";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <CRMNav />
      <main>{children}</main>
    </div>
  );
}
