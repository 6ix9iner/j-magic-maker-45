import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Check authentication: Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.warn('❌ Request rejected: Missing Authorization header')
      return new Response(
        JSON.stringify({ error: 'No authorization header provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase Client with caller's authorization header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Retrieve user profile to confirm JWT is valid and authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      console.warn('❌ Request rejected: Invalid or expired JWT token', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized user session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Authorized access by user: ${user.id} (${user.email || 'no-email'})`)

    // Get Dynamsoft License Key from environment variables
    const dynamsoftKey = Deno.env.get('DYNAMSOFT_LICENSE_KEY')
    if (!dynamsoftKey) {
      console.error('❌ DYNAMSOFT_LICENSE_KEY environment secret is missing')
      return new Response(
        JSON.stringify({ error: 'DYNAMSOFT_LICENSE_KEY secret is not configured in Supabase' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ key: dynamsoftKey }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Error handling request:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
