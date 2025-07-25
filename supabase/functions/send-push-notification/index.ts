
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  user_id: string
  title: string
  body: string
  notification_type?: string
  data?: any
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { user_id, title, body, notification_type = 'general', data = {} }: NotificationRequest = await req.json()

    console.log('🔔 Sending OneSignal push notification:', { user_id, title, body, notification_type })

    // Get OneSignal configuration from environment variables
    const oneSignalAppId = '904ebe61-ff30-44e2-8c3d-1c936a10597d'
    const oneSignalRestApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY')
    
    if (!oneSignalRestApiKey) {
      console.error('❌ ONESIGNAL_REST_API_KEY environment variable is missing')
      throw new Error('OneSignal REST API Key missing. Please set ONESIGNAL_REST_API_KEY environment variable.')
    }

    console.log('✅ OneSignal configuration loaded, app ID:', oneSignalAppId)

    // Prepare OneSignal notification payload with enhanced settings for immediate delivery
    const oneSignalPayload = {
      app_id: oneSignalAppId,
      include_external_user_ids: [user_id],
      headings: { en: title },
      contents: { en: body },
      priority: 10, // Highest priority for immediate delivery
      ttl: 259200, // 3 days TTL
      data: {
        notification_type: notification_type || 'general',
        timestamp: new Date().toISOString(),
        force_display: 'true',
        ...(data && typeof data === 'object' ? data : {})
      },
      // Android specific settings for immediate delivery
      android_accent_color: notification_type === 'sale_completed' ? 'FF22C55E' : 
                           notification_type === 'receipt_generated' ? 'FF3B82F6' : 'FF6366F1',
      android_visibility: 1, // Public visibility
      android_channel_id: 'sales_notifications',
      // Force display even if app is in foreground
      content_available: true,
      mutable_content: true
    }

    console.log('📤 OneSignal Payload:', JSON.stringify(oneSignalPayload, null, 2))

    // Send notification via OneSignal REST API
    const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${oneSignalRestApiKey}`,
      },
      body: JSON.stringify(oneSignalPayload),
    })

    const responseText = await oneSignalResponse.text()
    console.log('📨 OneSignal Response Status:', oneSignalResponse.status)
    console.log('📨 OneSignal Response Text:', responseText)

    let oneSignalResult
    try {
      oneSignalResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('❌ Failed to parse OneSignal response as JSON:', parseError)
      oneSignalResult = { 
        error: 'OneSignal response parsing failed', 
        response: responseText.substring(0, 200) + '...',
        status: oneSignalResponse.status
      }
    }

    const success = oneSignalResponse.ok && oneSignalResult.id
    console.log('🎯 OneSignal notification result:', { success, result: oneSignalResult })

    // Create Supabase client for logging
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Log the notification attempt with enhanced details
    const { error: logError } = await supabaseClient.from('notification_logs').insert({
      user_id,
      title,
      body,
      notification_type,
      data: { 
        notification_type, 
        timestamp: new Date().toISOString(), 
        onesignal_id: oneSignalResult.id || null,
        delivery_priority: 'high',
        ...data 
      },
      success,
      error_message: success ? null : JSON.stringify(oneSignalResult),
    })

    if (logError) {
      console.error('❌ Error logging notification:', logError)
    } else {
      console.log('✅ Notification logged successfully')
    }

    if (!success) {
      console.error('❌ OneSignal notification failed:', oneSignalResult)
      throw new Error(`OneSignal notification failed: ${JSON.stringify(oneSignalResult)}`)
    }

    console.log('🎉 OneSignal notification sent successfully with ID:', oneSignalResult.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        result: oneSignalResult,
        notification_id: oneSignalResult.id,
        message: 'Push notification sent successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Push notification error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

