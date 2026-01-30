"use client";

import { ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { UserRole } from "@/types";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
}

export function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      // 1. Not Logged In
      if (!user) {
        router.replace(`/login?from=${encodeURIComponent(pathname)}`);
        return;
      }

      // 2. Profile Missing (Authenticated but no profile)
      // If we have a user but no profile, something is wrong or they are new.
      // Redirect to onboarding to create/fetch profile if possible, or just stay safe.
      if (!profile) {
         if (pathname !== "/onboarding") {
             router.replace("/onboarding");
         }
         return; 
      }

      // 3. Role Mismatch
      if (requiredRole && profile.role !== requiredRole) {
        const redirectPath =
          profile.role === "COLLECTOR"
            ? "/collector/dashboard"
            : "/seller/dashboard";
        
        if (pathname !== redirectPath) {
            router.replace(redirectPath);
        }
        return;
      }

      // 4. Collector Incomplete Profile
      if (
        profile.role === "COLLECTOR" &&
        !profile.vehicleType &&
        pathname !== "/onboarding"
      ) {
        router.replace("/onboarding");
      }
    }
  }, [user, profile, loading, router, pathname, requiredRole]);

  if (loading || !user || (!profile && pathname !== "/onboarding") || (requiredRole && profile?.role !== requiredRole)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
