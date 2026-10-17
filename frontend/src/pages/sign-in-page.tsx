import { SignIn } from "@clerk/clerk-react"
import { Link } from "react-router-dom"
import { Sparkles, ShieldCheck } from "lucide-react"
import { vibeLearnClerkAppearance } from "@/lib/clerk-appearance"
import { env } from "@/config/env"
import logoImg from "@/assets/logo.png"

export function SignInPage() {
  const demoEmail = env.VITE_DEMO_ADMIN_EMAIL || "vibelearn.admin@gmail.com"
  const demoPassword = env.VITE_DEMO_ADMIN_PASSWORD || "VibeLearnAdmin2026!"

  return (
    <div className="relative flex min-h-[calc(100vh-72px)] flex-col items-center justify-center overflow-hidden bg-background px-4 py-12 text-foreground">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary-500/10 blur-3xl dark:bg-primary-500/15"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center">
        {/* Brand header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <Link
            to="/"
            className="group mb-4 flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <img
              src={logoImg}
              alt="Vibe Learn Logo"
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <span className="font-sans text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Vibe <span className="text-primary-500">Learn</span>
            </span>
          </Link>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-800 dark:bg-primary-950/60 dark:text-primary-300">
            <Sparkles className="h-3.5 w-3.5 text-primary-500" />
            <span>WELCOME BACK</span>
          </div>

          <h1 className="mt-3 font-serif text-3xl font-bold text-foreground">
            Continue Your Journey
          </h1>
          <p className="mt-1.5 font-sans text-sm text-muted-foreground">
            Sign in to track your progress and resume your lessons
          </p>
        </div>

        {/* Clerk Sign In component */}
        <SignIn
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          appearance={vibeLearnClerkAppearance}
        />

        {/* Demo Admin Credentials Box */}
        <div className="mt-6 w-full rounded-2xl border border-primary-200/80 bg-primary-50/70 p-4 text-xs shadow-xs dark:border-primary-900/60 dark:bg-primary-950/40">
          <div className="flex items-center gap-2 font-semibold text-primary-800 dark:text-primary-300">
            <ShieldCheck className="h-4 w-4 text-primary-600 dark:text-primary-400" />
            <span>Public Demo Admin Login</span>
          </div>
          <div className="mt-2.5 space-y-1 font-mono text-neutral-800 dark:text-neutral-200">
            <p className="flex items-center justify-between">
              <span className="font-sans font-medium text-neutral-500 dark:text-neutral-400">Email:</span>
              <span className="select-all font-semibold text-primary-700 dark:text-primary-300">{demoEmail}</span>
            </p>
            <p className="flex items-center justify-between">
              <span className="font-sans font-medium text-neutral-500 dark:text-neutral-400">Password:</span>
              <span className="select-all font-semibold text-primary-700 dark:text-primary-300">{demoPassword}</span>
            </p>
          </div>
        </div>

        {/* Bottom reassurance */}
        <p className="mt-6 text-center font-sans text-xs text-muted-foreground">
          By continuing, you agree to Vibe Learn's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}

export default SignInPage
