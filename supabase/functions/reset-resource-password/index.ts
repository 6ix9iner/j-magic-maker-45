import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mirrors the simple hash used client-side (InventoryPasswordSettings.tsx /
// SalesPasswordSettings.tsx) so a hash written here verifies correctly
// against what the app checks on unlock. Not cryptographic - this is a
// secondary screen lock, not the account password.
function hashPassword(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString()
}

/**
 * Completes an Inventory/Sales password reset. No user session is
 * required or expected here - the single-use token from the emailed link
 * (see request-resource-password-reset) IS the credential, since the
 * person may be opening this link cold, on any device.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { token, new_password } = await req.json()
    if (!token || typeof token !== 'string') {
      return new Response(
        JSON.stringify({ error: 'A reset token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!new_password || String(new_password).length < 4) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 4 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('APP_SECRET_KEY') ?? ''
    )

    const { data: tokenRow, error: tokenError } = await admin
      .from('resource_password_reset_tokens')
      .select('id, user_id, resource, expires_at, used_at')
      .eq('token', token)
      .maybeSingle()

    if (tokenError) throw tokenError
    if (!tokenRow) {
      return new Response(
        JSON.stringify({ error: 'This reset link is invalid.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (tokenRow.used_at) {
      return new Response(
        JSON.stringify({ error: 'This reset link has already been used. Request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return new Response(
        JSON.stringify({ error: 'This reset link has expired. Request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const column = tokenRow.resource === 'inventory' ? 'inventory_password_hash' : 'sales_password_hash'
    const hashedPassword = hashPassword(String(new_password))

    const { error: updateError } = await admin
      .from('business_info')
      .update({ [column]: hashedPassword, updated_at: new Date().toISOString() })
      .eq('user_id', tokenRow.user_id)

    if (updateError) throw updateError

    const { error: markUsedError } = await admin
      .from('resource_password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenRow.id)
    if (markUsedError) console.error('Failed to mark reset token used:', markUsedError)

    return new Response(
      JSON.stringify({ success: true, resource: tokenRow.resource }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('💥 reset-resource-password error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
