# MySkrib

A point-of-sale and inventory management app for small businesses: barcode
scanning, stock tracking, sales history, a dashboard, and an AI business
accountant. Runs as a responsive web app and as a native Android/iOS app via
Capacitor.

## Tech stack

- **Frontend:** React 18 + TypeScript + Vite, Tailwind CSS, shadcn/ui (Radix
  primitives)
- **Native shell:** Capacitor 7 (Android & iOS)
- **Backend:** Supabase (Postgres, Auth, Row Level Security, Edge Functions)
- **Offline support:** Dexie (IndexedDB) with a sync-queue engine for
  local-first reads/writes on native platforms — see
  [`src/lib/offline`](src/lib/offline)
- **Barcode scanning:** native ML Kit on Android/iOS, Dynamsoft on web

## Getting started

```bash
npm install
npm run dev        # start the Vite dev server
```

No `.env` setup is needed to run the app: the Supabase project URL and
publishable key are constants in
[`src/integrations/supabase/client.ts`](src/integrations/supabase/client.ts)
(the publishable key is meant to be public - it's safe to ship in client
code). `.env.local` in this repo only holds a Vercel CLI token used for
`vercel` commands, not app config.

### Building for native

```bash
npm run sync:android   # build the web bundle and sync it into android/
npm run open:android   # open the project in Android Studio
```

## Project structure

```
src/
  components/     UI components, grouped by feature (inventory/, sales/, barcode/, ...)
  pages/          Routed screens (see src/App.tsx for the route table)
  lib/offline/    Local-first data layer: Dexie schema, repository, sync engine
  integrations/   Generated/typed Supabase client and DB types
  utils/          Small framework-agnostic helpers
  hooks/          Shared React hooks
supabase/
  functions/      Deno edge functions (email, AI chat, push notifications, ...)
  migrations/     SQL schema migrations, applied via the Supabase Management API/CLI
android/, ios/    Native Capacitor projects
```

## Security notes

- Every table is protected by Postgres Row Level Security, scoped to
  `auth.uid()`.
- The project uses Supabase's new-style API keys, not the legacy
  anon/service_role JWTs. Edge functions that need elevated access read it
  from the `APP_SECRET_KEY` project secret; the client uses `APP_PUBLISHABLE_KEY`.
  **Never hardcode either one** in a script or anywhere else - `APP_SECRET_KEY`
  grants full, RLS-bypassing access to every user's data.
- Optional per-screen passwords (Inventory/Sales lock) are separate from the
  account login password and are stored as PBKDF2-SHA256 hashes (100k
  iterations, random salt per password) — see
  [`src/utils/resourcePassword.ts`](src/utils/resourcePassword.ts).
