// File: app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout will have no navbar
  return <>{children}</>;
}