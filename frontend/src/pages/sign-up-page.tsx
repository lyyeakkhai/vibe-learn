import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Rocket, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import logoImg from "@/assets/logo.png"

export function SignUpPage() {
  const navigate = useNavigate()
  const { signup, login } = useAuth()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await signup(email, password, fullName)
      setSuccess(true)
      // Automatically log the user in after registration
      await login(email, password)
      navigate("/courses")
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

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
            <Rocket className="h-3.5 w-3.5 text-primary-500" />
            <span>START LEARNING FOR FREE</span>
          </div>

          <h1 className="mt-3 font-serif text-3xl font-bold text-foreground">
            Create Your Account
          </h1>
          <p className="mt-1.5 font-sans text-sm text-muted-foreground">
            Join thousands of developers mastering modern web skills
          </p>
        </div>

        {/* Sign Up Form Card */}
        <div className="w-full rounded-2xl border border-neutral-200 bg-card p-6 shadow-md dark:border-neutral-800">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Account created! Redirecting...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 active:bg-primary-700 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Already have an account?{" "}
            </span>
            <Link
              to="/sign-in"
              className="text-xs font-semibold text-primary-500 hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Bottom reassurance */}
        <p className="mt-6 text-center font-sans text-xs text-muted-foreground">
          By creating an account, you agree to Vibe Learn's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}

export default SignUpPage
