/// <reference types="vitest/config" />
import { defineConfig } from "vite";

// Separate from vite.config.ts's `test` block on purpose: these tests hit
// the real Supabase project's RPCs over the network and need a dedicated
// test account's credentials (see supabase/tests/README.md). They must
// never run as part of the default `npm test` / CI unit-test job.
export default defineConfig({
  test: {
    environment: "node",
    include: ["supabase/tests/**/*.integration.test.ts"],
    globals: false,
    testTimeout: 20_000,
  },
});
