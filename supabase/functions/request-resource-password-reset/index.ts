import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const APP_URL = Deno.env.get('APP_URL') || 'https://insightinventory.vercel.app'

const RESOURCE_LABEL: Record<string, string> = {
  inventory: 'Inventory',
  sales: 'Sales Management',
}

/**
 * The Inventory/Sales screens can each have their own optional access
 * password, separate from the account login password. This issues a
 * single-use, time-limited reset link emailed to the account's own
 * address when that screen-specific password is forgotten - it never
 * touches the account login password itself.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user || !user.email) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized user session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { resource } = await req.json()
    if (resource !== 'inventory' && resource !== 'sales') {
      return new Response(
        JSON.stringify({ error: 'resource must be "inventory" or "sales"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const tokenBytes = new Uint8Array(32)
    crypto.getRandomValues(tokenBytes)
    const token = Array.from(tokenBytes).map((b) => b.toString(16).padStart(2, '0')).join('')

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    const { error: insertError } = await admin.from('resource_password_reset_tokens').insert({
      user_id: user.id,
      resource,
      token,
      expires_at: expiresAt.toISOString(),
    })
    if (insertError) throw insertError

    const resetUrl = `${APP_URL}/reset-resource-password?token=${token}&resource=${resource}`
    const label = RESOURCE_LABEL[resource]

    const smtpHost = Deno.env.get('SMTP_HOST')
    const smtpUser = Deno.env.get('SMTP_USER')
    const smtpPass = Deno.env.get('SMTP_PASS')
    const senderName = Deno.env.get('SMTP_SENDER_NAME') || 'MySkrib'

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.error('SMTP not configured - cannot send reset email')
      return new Response(
        JSON.stringify({ error: 'Email sending is not configured yet. Please contact support.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Port 465 with implicit TLS, not 587/STARTTLS: the STARTTLS upgrade
    // path (Deno.startTls) isn't reliably supported in this sandboxed edge
    // runtime and made every send fail with an opaque 503 at boot -
    // verified directly against this same SMTP account before switching.
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: 465,
        tls: true,
        auth: { username: smtpUser, password: smtpPass },
      },
    })

    try {
      await client.send({
        from: `${senderName} <${smtpUser}>`,
        to: user.email,
        subject: `Reset your ${label} password`,
        content: 'auto',
        html: `
          <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color:#1e293b;">Reset your ${label} password</h2>
            <p style="color:#475569; line-height:1.6;">
              We received a request to reset the password protecting your ${label} screen in ${senderName}.
              This is separate from your account login password.
            </p>
            <p style="margin: 24px 0;">
              <a href="${resetUrl}" style="background:#4f46e5; color:#fff; padding:12px 24px; border-radius:10px; text-decoration:none; font-weight:600;">
                Set a new ${label} password
              </a>
            </p>
            <p style="color:#94a3b8; font-size:13px; line-height:1.6;">
              This link expires in 1 hour. If you didn't request this, you can safely ignore this email -
              your ${label} password will stay unchanged.
            </p>
            <p style="color:#94a3b8; font-size:12px; word-break:break-all;">${resetUrl}</p>
          </div>
        `,
      })
    } finally {
      await client.close()
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('💥 request-resource-password-reset error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
