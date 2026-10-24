import type { ReactNode } from "react"
import { SignedIn, SignedOut, RedirectToSignIn } from "@/contexts/auth-context"

export function ProtectedRoute({ children }: { children: ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  )
}

export default ProtectedRoute
