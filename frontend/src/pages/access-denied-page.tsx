import { Link } from "react-router-dom";
import { ShieldAlert, BookOpen, Home } from "lucide-react";

export function AccessDeniedPage() {
  return (
    <div className="flex min-h-[calc(100vh-144px)] items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full max-w-md text-center">
        {/* Status Badge & Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 text-red-600 shadow-inner dark:bg-red-950/40 dark:text-red-400">
          <ShieldAlert className="h-10 w-10" />
        </div>

        <span className="mt-6 inline-block rounded-full bg-red-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-red-700 dark:bg-red-950/60 dark:text-red-300">
          403 Access Denied
        </span>

        {/* Heading & Explanation */}
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
          Administrator Access Required
        </h1>

        <p className="mt-3 text-base text-neutral-600 dark:text-neutral-400">
          You are signed in, but your account does not have administrative privileges to access the Course Management portal.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/courses"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 active:bg-primary-700"
          >
            <BookOpen className="h-4 w-4" />
            Explore Courses
          </Link>

          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 shadow-xs transition hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <Home className="h-4 w-4" />
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AccessDeniedPage;
