"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function CollectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRole="COLLECTOR">
      {children}
    </ProtectedRoute>
  );
}
