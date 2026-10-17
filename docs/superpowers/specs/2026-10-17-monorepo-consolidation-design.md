# Architecture & Design: Monorepo Consolidation (`vibe-learn`)

**Document Date:** 2026-10-17  
**Status:** Approved  
**Scope:** Repository Architecture & Developer Experience  

---

## 1. Overview & Objectives

Currently, Vibelearn is split across two separate repositories:
1. `vibelearn-backend`: NestJS 11 + TypeORM 0.3 + Supabase PostgreSQL
2. `vibe-learn`: Vite + React + Tailwind + Clerk frontend

The objective is to consolidate both codebases into a single, cohesive **Monorepo** inside `vibe-learn`:
- Retain **100% of the commit history** from `vibelearn-backend` using `git subtree`.
- Structure into two clean directories: `frontend/` and `backend/`.
- Provide a **single root `.env`** configuration file so developers and teammates only manage credentials in one place.
- Provide a **single command startup** (`pnpm dev` or `pnpm run start:dev`) that starts both the backend API and frontend dev server concurrently.

---

## 2. Directory Structure

```text
vibe-learn/
├── frontend/                  # React + Vite application
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts         # Configured with envDir: '../'
│   └── tsconfig.json
├── backend/                   # NestJS API application (with preserved git history)
│   ├── src/
│   ├── docs/
│   ├── package.json
│   ├── nest-cli.json
│   └── tsconfig.json
├── pnpm-workspace.yaml        # Declares packages: ['frontend', 'backend']
├── package.json               # Root monorepo scripts (concurrently dev runner)
├── .env                       # Unified single environment file (git-ignored)
├── .env.example               # Unified single template with all variables documented
├── .gitignore                 # Root gitignore covering both apps
└── README.md                  # Comprehensive onboarding instructions
```

---

## 3. Git History Preservation Strategy

To preserve all commit history, timestamps, and commit authors from `vibelearn-backend`:

1. **Working Branch**:
   Create a new branch in `/Users/lyyeakkhai/workspace/vibe-learn`:
   ```bash
   git checkout -b feat/monorepo-consolidation
   ```
2. **Move Frontend Files**:
   Create `frontend/` and move all current files (`src`, `public`, `package.json`, `vite.config.ts`, `tsconfig*.json`, etc.) into `frontend/`:
   ```bash
   mkdir -p frontend
   git mv src public index.html vite.config.ts components.json tsconfig*.json eslint.config.js vercel.json package.json frontend/
   git commit -m "refactor: restructure frontend into frontend/ directory"
   ```
3. **Merge Backend with Full History via Git Subtree**:
   Add `vibelearn-backend` as a local remote and pull its latest commits into `backend/`:
   ```bash
   git remote add backend-source /Users/lyyeakkhai/workspace/vibelearn-backend
   git fetch backend-source
   git subtree add --prefix=backend backend-source feat/supabase-database-migration -m "feat: merge backend into backend/ preserving git history"
   git remote remove backend-source
   ```

---

## 4. Single Root Environment Configuration

### 4.1 Root `.env` & `.env.example`
All environment variables are declared in `.env` at the monorepo root:
```env
# ==========================================
# Vibelearn Monorepo Environment Config
# ==========================================

# --- Common / Server Ports ---
PORT=3000
FRONTEND_URL=http://localhost:5173

# --- Backend: Supabase PostgreSQL (Session Pooler) ---
DATABASE_URL=postgresql://postgres.cjijaeecoasgfbufijqa:gybvob-2cykmE-razqar@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
DB_SSL=true

# --- Clerk Authentication ---
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# --- Frontend (Vite) ---
VITE_API_URL=http://localhost:3000/api
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### 4.2 Frontend Loading (`frontend/vite.config.ts`)
Set `envDir: '../'` so Vite looks up to the root directory for `.env`:
```typescript
export default defineConfig({
  envDir: '../',
  plugins: [react()],
  // ...
});
```

### 4.3 Backend Loading (`backend/src/app.module.ts` & `backend/src/database/data-source.ts`)
Set `ConfigModule` and `dotenv` to load the root `.env`:
```typescript
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: [
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '.env'),
    '.env',
  ],
})
```
And in `data-source.ts`:
```typescript
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();
```

---

## 5. Developer Experience & Scripts

### 5.1 Root `pnpm-workspace.yaml`
```yaml
packages:
  - 'frontend'
  - 'backend'
```

### 5.2 Root `package.json`
```json
{
  "name": "vibe-learn",
  "private": true,
  "scripts": {
    "dev": "concurrently -n \"backend,frontend\" -c \"blue,magenta\" \"pnpm --filter backend start:dev\" \"pnpm --filter frontend dev\"",
    "start:dev": "pnpm run dev",
    "dev:frontend": "pnpm --filter frontend dev",
    "dev:backend": "pnpm --filter backend start:dev",
    "build": "pnpm --filter backend build && pnpm --filter frontend build",
    "test": "pnpm --filter backend test",
    "lint": "pnpm --recursive lint"
  },
  "devDependencies": {
    "concurrently": "^9.1.2"
  }
}
```

### 5.3 Teammate Onboarding
A new teammate only executes 3 steps:
1. `git clone https://github.com/lyyeakkhai/vibe-learn.git`
2. `cp .env.example .env` (fill credentials once)
3. `pnpm install && pnpm dev`

---

## 6. Verification Checklist
1. Verify git history in `backend/` with `git log backend/` to ensure all commits are intact.
2. Verify root `pnpm install` links both workspaces without hoisting conflicts.
3. Verify `pnpm run build` succeeds for both `frontend` and `backend`.
4. Verify `pnpm dev` launches both NestJS on `http://localhost:3000` and Vite on `http://localhost:5173` successfully reading variables from root `.env`.
