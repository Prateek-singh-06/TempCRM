// File: app/(main)/layout.tsx
import CRMNav from "@/components/nav/CRMNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CRMNav />
      <main>{children}</main>
    </>
  );
}