import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./globals.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { AuthProvider } from "@/contexts/auth-context.tsx"

// Erase any lingering legacy Clerk cookies from prior sessions
if (typeof document !== "undefined") {
  const legacyPrefixes = ["__clerk", "__client", "__session", "clerk_"]
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0].trim()
    if (legacyPrefixes.some((prefix) => name.startsWith(prefix))) {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${window.location.hostname}`
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`
    }
  })
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider defaultTheme="light">
        <App />
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>
)
