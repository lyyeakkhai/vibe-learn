import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useUser, RedirectToSignIn } from "@/contexts/auth-context";
import { useUserRole } from "@/hooks/use-user-role";
import { AccessDeniedPage } from "@/pages/access-denied-page";

export function AdminRoute({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const { isAdmin, isLoading } = useUserRole();

  if (!isLoaded || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  if (!isAdmin) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
}

export default AdminRoute;
