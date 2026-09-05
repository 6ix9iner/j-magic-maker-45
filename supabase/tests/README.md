# Money-path integration tests

`moneyPath.integration.test.ts` calls the real `decrement_stock` and
`delete_sale` Postgres RPCs against a live Supabase project, as a real
authenticated user - this is the only way to actually exercise the RLS
policies and the idempotency ledger, not a mock of them.

**Never point this at an account with real business data.** Each test
creates and cleans up its own `__TEST_PRODUCT__` rows, but use a disposable
test account regardless.

## One-time setup

1. Create a dedicated test user (email/password). Easiest way: run
   `scripts/create_test_user.js` with a service_role key, or just sign up
   through the app normally with a throwaway address.
2. Set these env vars locally (e.g. in a gitignored `.env.test`, sourced
   before running the command below - never commit it):

   ```
   TEST_SUPABASE_URL=https://<project-ref>.supabase.co
   TEST_SUPABASE_ANON_KEY=<the project's publishable/anon key>
   TEST_USER_EMAIL=<the test account's email>
   TEST_USER_PASSWORD=<the test account's password>
   ```

## Running

```bash
npm run test:integration
```

Without those four env vars set, this suite is skipped (not failed) - it's
intentionally never part of `npm test` or the default CI job, since it
needs real credentials and hits the network. If you want it in CI too, add
the four values as repository secrets and wire a job that only runs when
they're present (see `.github/workflows/ci.yml` for where the unit-test job
lives; keep this as a separate, opt-in job rather than folding it in).
