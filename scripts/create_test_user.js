// Dev-only utility: creates (or confirms the existence of) a throwaway test
// account, using the Supabase admin API. Requires the project's
// service_role key - NEVER hardcode that key here. Pass it via environment
// variable instead, e.g.:
//
//   SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_URL=... node scripts/create_test_user.js
//
// Get the service_role key from the Supabase dashboard (Project Settings >
// API). It grants full, RLS-bypassing access to the database - treat it
// like a root password and never commit it or share it outside a secret
// manager / local .env file that's gitignored.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY environment variables.\n' +
    'Run this script as:\n' +
    '  SUPABASE_URL=https://<project-ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/create_test_user.js'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const email = process.env.TEST_USER_EMAIL || 'testuser@example.com';
  const password = process.env.TEST_USER_PASSWORD;

  if (!password) {
    console.error('Set TEST_USER_PASSWORD to the password the test account should get.');
    process.exit(1);
  }

  console.log('Listing users...');
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }

  console.log(`Found ${users.length} users:`);
  users.forEach(u => console.log(`- ${u.email} (${u.id})`));

  const existing = users.find(u => u.email === email);
  if (existing) {
    console.log(`User ${email} already exists.`);
  } else {
    console.log(`Creating user ${email}...`);
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (createError) {
      console.error('Error creating user:', createError);
    } else {
      console.log('User created successfully:', user);
    }
  }
}

main().catch(console.error);
