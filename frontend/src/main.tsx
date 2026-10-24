import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./globals.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { AuthProvider } from "@/contexts/auth-context.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider defaultTheme="light">
        <App />
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>
)
