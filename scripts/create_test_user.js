import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qmkxlamdjcsyozrpyrar.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFta3hsYW1kamNzeW96cnB5cmFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTAyNzM4OCwiZXhwIjoyMDUwNjAzMzg4fQ.bp_7pdF_iu7rmBSaNcXcET7YXZTdyO0sA5xJlxGNkuk";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const email = 'testuser@example.com';
  const password = 'TestPassword123!';

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
