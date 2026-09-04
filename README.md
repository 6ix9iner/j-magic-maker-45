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

Copy `.env.local.example` (or ask a maintainer) for the Supabase project URL
and anon key expected by `src/integrations/supabase/client.ts`.

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
- Edge functions that need elevated access read the service_role key from
  the platform-managed `SUPABASE_SERVICE_ROLE_KEY` environment variable —
  **never hardcode it**, in a script or anywhere else. It grants full,
  RLS-bypassing access to every user's data.
- Optional per-screen passwords (Inventory/Sales lock) are separate from the
  account login password and are stored as salted SHA-256 hashes — see
  [`src/utils/resourcePassword.ts`](src/utils/resourcePassword.ts).
