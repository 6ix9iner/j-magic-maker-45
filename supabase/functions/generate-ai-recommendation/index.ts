import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Matches each query's own `.select(...)` below - see the ai-accountant-chat
// function for why these are hand-written instead of a shared Database type.
interface ProductRow {
  id: string
  name: string
  price: number
  purchase_price: number
  stock_count: number
  category: string | null
}
interface SaleRow {
  id: string
  total_amount: number
  created_at: string
}
interface SaleItemRow {
  name_at_sale: string
  product_id: string | null
  price_at_sale: number
  quantity: number
  created_at: string
}
interface RequestBody {
  user_id?: string
  source?: string
}

/**
 * Generates ONE sharp, numbers-backed, actionable growth recommendation from
 * a merchant's real sales/inventory data, then pushes it as a notification
 * (reusing send-push-notification / OneSignal) and logs the cadence in
 * notification_schedule so a scheduled dispatcher (see the
 * dispatch_ai_recommendations() SQL function + pg_cron job) doesn't spam the
 * same user more than once a day.
 *
 * Two ways to call this:
 *  1. On-demand from the app: Authorization: Bearer <user JWT>, empty body.
 *     Used by the "Get Growth Tip" button - always generates + sends fresh,
 *     no cooldown (the user asked for it right now).
 *  2. From the daily cron dispatcher: Authorization: Bearer <service role
 *     key>, body { user_id, source: 'cron' }. The cooldown/eligibility
 *     check already happened in SQL before this was even called.
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

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SERVICE_ROLE_KEY = Deno.env.get('APP_SECRET_KEY') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')

    let targetUserId: string
    let isCronCall = false

    let body: RequestBody = {}
    try { body = await req.json() } catch { /* empty body is fine */ }

    if (SERVICE_ROLE_KEY && token === SERVICE_ROLE_KEY && body?.user_id) {
      // Trusted server-to-server call (the cron dispatcher already decided
      // this user is eligible right now).
      targetUserId = body.user_id
      isCronCall = true
    } else {
      const supabaseClient = createClient(
        SUPABASE_URL,
        Deno.env.get('APP_PUBLISHABLE_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      )
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized user session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      targetUserId = user.id
    }

    console.log(`💡 Generating AI recommendation for user ${targetUserId}${isCronCall ? ' (cron)' : ' (on-demand)'}`)

    // Service-role client so this works identically whether called
    // on-demand (user JWT only proves identity) or from cron (no user JWT
    // exists at all). All queries below still explicitly filter by
    // targetUserId - this is not a broad, unscoped read.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const now = new Date()
    const day7Ago = new Date(now); day7Ago.setDate(now.getDate() - 7)
    const day14Ago = new Date(now); day14Ago.setDate(now.getDate() - 14)
    const day30Ago = new Date(now); day30Ago.setDate(now.getDate() - 30)
    const day60Ago = new Date(now); day60Ago.setDate(now.getDate() - 60)

    const [productsRes, businessInfoRes, sales60Res, items60Res] = await Promise.all([
      admin.from('products')
        .select('id, name, price, purchase_price, stock_count, category')
        .eq('user_id', targetUserId),
      admin.from('business_info')
        .select('business_name')
        .eq('user_id', targetUserId)
        .maybeSingle(),
      admin.from('sales')
        .select('id, total_amount, created_at')
        .eq('user_id', targetUserId)
        .gte('created_at', day60Ago.toISOString()),
      admin.from('sale_items')
        .select('name_at_sale, product_id, price_at_sale, quantity, created_at, sales!inner(user_id)')
        .eq('sales.user_id', targetUserId)
        .gte('created_at', day60Ago.toISOString()),
    ])

    const products: ProductRow[] = productsRes.data || []
    const businessName = businessInfoRes.data?.business_name || 'your store'
    const sales60: SaleRow[] = sales60Res.data || []
    const items60: SaleItemRow[] = items60Res.data || []

    // Not enough history to say anything useful/specific - don't waste a
    // notification (or the AI call) on a business with no data yet.
    if (sales60.length < 3 || products.length === 0) {
      console.log('Not enough data yet - skipping recommendation')
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Not enough sales history yet' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const purchasePriceByName = new Map<string, number>()
    const stockByName = new Map<string, number>()
    const categoryByName = new Map<string, string>()
    products.forEach((p) => {
      purchasePriceByName.set(p.name, parseFloat(String(p.purchase_price || 0)))
      stockByName.set(p.name, p.stock_count ?? 0)
      categoryByName.set(p.name, p.category || 'Uncategorised')
    })

    const inRange = (iso: string, from: Date, to?: Date) => {
      const t = new Date(iso).getTime()
      return t >= from.getTime() && (!to || t < to.getTime())
    }

    // Revenue: this week vs the week before, this month(30d) vs the 30d before that
    const rev7 = sales60.filter((s) => inRange(s.created_at, day7Ago)).reduce((sum, s) => sum + parseFloat(String(s.total_amount || 0)), 0)
    const revPrev7 = sales60.filter((s) => inRange(s.created_at, day14Ago, day7Ago)).reduce((sum, s) => sum + parseFloat(String(s.total_amount || 0)), 0)
    const rev30 = sales60.filter((s) => inRange(s.created_at, day30Ago)).reduce((sum, s) => sum + parseFloat(String(s.total_amount || 0)), 0)
    const revPrev30 = sales60.filter((s) => inRange(s.created_at, day60Ago, day30Ago)).reduce((sum, s) => sum + parseFloat(String(s.total_amount || 0)), 0)

    // Per-product velocity (last 7 days) to estimate stockout risk, plus
    // 30d revenue/profit for margin-trend and best/worst seller framing.
    const velocity7 = new Map<string, number>()
    const productStats30 = new Map<string, { qty: number; revenue: number; cost: number }>()
    const productStatsPrev30 = new Map<string, { qty: number; revenue: number; cost: number }>()

    items60.forEach((it) => {
      const qty = it.quantity || 0
      const price = parseFloat(String(it.price_at_sale || 0))
      const revenue = price * qty
      const cost = (purchasePriceByName.get(it.name_at_sale) || 0) * qty

      if (inRange(it.created_at, day7Ago)) {
        velocity7.set(it.name_at_sale, (velocity7.get(it.name_at_sale) || 0) + qty)
      }
      if (inRange(it.created_at, day30Ago)) {
        const ex = productStats30.get(it.name_at_sale) || { qty: 0, revenue: 0, cost: 0 }
        productStats30.set(it.name_at_sale, { qty: ex.qty + qty, revenue: ex.revenue + revenue, cost: ex.cost + cost })
      } else if (inRange(it.created_at, day60Ago, day30Ago)) {
        const ex = productStatsPrev30.get(it.name_at_sale) || { qty: 0, revenue: 0, cost: 0 }
        productStatsPrev30.set(it.name_at_sale, { qty: ex.qty + qty, revenue: ex.revenue + revenue, cost: ex.cost + cost })
      }
    })

    const margin30 = (() => {
      let revenue = 0, cost = 0
      productStats30.forEach((s) => { revenue += s.revenue; cost += s.cost })
      return revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0
    })()
    const marginPrev30 = (() => {
      let revenue = 0, cost = 0
      productStatsPrev30.forEach((s) => { revenue += s.revenue; cost += s.cost })
      return revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0
    })()

    // Stockout risk: selling fast but not much left.
    const stockoutRisk = products
      .map((p) => {
        const soldLast7 = velocity7.get(p.name) || 0
        const dailyRate = soldLast7 / 7
        const daysLeft = dailyRate > 0 ? p.stock_count / dailyRate : Infinity
        return { name: p.name, stock: p.stock_count, soldLast7, daysLeft }
      })
      .filter((p) => p.soldLast7 > 0 && p.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft)

    // Dead stock: sitting in inventory, zero sales in 30 days.
    const deadStock = products
      .filter((p) => p.stock_count > 0 && !(productStats30.get(p.name)?.qty > 0))
      .map((p) => ({ name: p.name, stock: p.stock_count, category: p.category }))
      .slice(0, 10)

    const topSellers30 = Array.from(productStats30.entries())
      .map(([name, s]) => ({ name, qty: s.qty, revenue: s.revenue, profit: s.revenue - s.cost }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    const prompt = `You are a sharp, practical small-business growth advisor for "${businessName}", a retail store using a point-of-sale app. All currency is Nigerian Naira (₦).

Here is their real, current business data:

REVENUE
- Last 7 days: ₦${rev7.toLocaleString()} (previous 7 days: ₦${revPrev7.toLocaleString()})
- Last 30 days: ₦${rev30.toLocaleString()} (previous 30 days: ₦${revPrev30.toLocaleString()})
- Gross margin last 30 days: ${margin30.toFixed(1)}% (previous 30 days: ${marginPrev30.toFixed(1)}%)

STOCKOUT RISK (selling fast, about to run out - fewer than 7 days of stock left at current pace)
${stockoutRisk.length > 0 ? stockoutRisk.map((p) => `- ${p.name}: ${p.stock} left, selling ~${(p.soldLast7 / 7).toFixed(1)}/day → ~${p.daysLeft.toFixed(1)} days until stockout`).join('\n') : 'None currently.'}

DEAD STOCK (in inventory, zero units sold in the last 30 days)
${deadStock.length > 0 ? deadStock.map((p) => `- ${p.name} (${p.category}): ${p.stock} units sitting unsold`).join('\n') : 'None currently.'}

TOP 5 SELLERS (last 30 days, by revenue)
${topSellers30.length > 0 ? topSellers30.map((p, i) => `${i + 1}. ${p.name}: ${p.qty} sold, ₦${p.revenue.toLocaleString()} revenue, ₦${p.profit.toLocaleString()} profit`).join('\n') : 'No sales yet.'}

TASK: Pick the SINGLE most valuable, specific, actionable thing this owner should do right now based on this data - not a generic tip. Prioritize in this order when applicable: (1) imminent stockout on a fast seller, (2) a real margin/revenue drop worth investigating, (3) dead stock tying up money, (4) an opportunity to double down on a top seller. Reference exact numbers and product names from the data above. Write it like a smart business partner giving one sharp piece of advice, not a report.

Respond with ONLY a JSON object, no markdown, no code fences:
{
  "title": "<a punchy notification headline, under 45 characters>",
  "body": "<the specific, numbers-backed recommendation, 1-2 sentences, under 160 characters>",
  "type": "<one of: restock, pricing, dead_stock, opportunity, cashflow>"
}`

    const KIMI_API_KEY = Deno.env.get('KIMI_API_KEY')
    const KIMI_WORKSPACE_ID = Deno.env.get('KIMI_WORKSPACE_ID')
    if (!KIMI_API_KEY) {
      throw new Error('KIMI_API_KEY is not configured')
    }
    const kimiHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KIMI_API_KEY}`,
    }
    if (KIMI_WORKSPACE_ID) kimiHeaders['X-DashScope-WorkSpace'] = KIMI_WORKSPACE_ID

    const kimiResponse = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: kimiHeaders,
      body: JSON.stringify({
        model: 'kimi-k3',
        messages: [
          { role: 'system', content: 'You are a precise, concise business growth advisor. You only output valid JSON when asked to.' },
          { role: 'user', content: prompt },
        ],
        // Note: kimi-k3 is a reasoning model and rejects `temperature`
        // (InternalError.Algo.InvalidParameter) - don't send it.
      }),
    })

    if (!kimiResponse.ok) {
      const errorText = await kimiResponse.text()
      console.error('Kimi API error:', errorText)
      throw new Error(`Kimi API responded with status ${kimiResponse.status}: ${errorText}`)
    }

    const kimiData = await kimiResponse.json()
    const raw = kimiData.choices?.[0]?.message?.content || '{}'

    let recommendation: { title: string; body: string; type: string }
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      recommendation = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
      if (!recommendation.title || !recommendation.body) throw new Error('Missing title/body')
    } catch (parseError) {
      console.warn('Could not parse AI recommendation JSON, using data-driven fallback:', parseError, 'raw:', raw)
      if (stockoutRisk.length > 0) {
        const p = stockoutRisk[0]
        recommendation = {
          title: `Restock ${p.name} soon`,
          body: `Only ${p.stock} left and selling ~${(p.soldLast7 / 7).toFixed(1)}/day — about ${p.daysLeft.toFixed(0)} days until you sell out.`,
          type: 'restock',
        }
      } else if (deadStock.length > 0) {
        recommendation = {
          title: `${deadStock.length} product${deadStock.length > 1 ? 's' : ''} not moving`,
          body: `${deadStock[0].name} hasn't sold in 30 days with ${deadStock[0].stock} units in stock — consider a discount or bundle.`,
          type: 'dead_stock',
        }
      } else {
        recommendation = {
          title: 'Weekly business check-in',
          body: `Last 7 days: ₦${rev7.toLocaleString()} revenue (${rev7 >= revPrev7 ? 'up' : 'down'} from ₦${revPrev7.toLocaleString()} the week before).`,
          type: 'opportunity',
        }
      }
    }

    // Push it as a notification (reuses the same OneSignal path + logging
    // as every other in-app notification).
    let sent = false
    try {
      const pushResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({
          user_id: targetUserId,
          title: `💡 ${recommendation.title}`,
          body: recommendation.body,
          notification_type: 'ai_recommendation',
          data: { rec_type: recommendation.type },
        }),
      })
      sent = pushResponse.ok
      if (!sent) console.error('send-push-notification failed:', await pushResponse.text())
    } catch (pushError) {
      console.error('Failed to send AI recommendation push:', pushError)
    }

    // Record the cadence so the cron dispatcher's cooldown check (see the
    // dispatch_ai_recommendations() SQL function) knows this user was just
    // covered, regardless of whether it was this cron run or an on-demand
    // tap that covered them.
    const { error: scheduleError } = await admin
      .from('notification_schedule')
      .upsert(
        { user_id: targetUserId, notification_type: 'ai_recommendation', last_sent_at: now.toISOString() },
        { onConflict: 'user_id,notification_type' }
      )
    if (scheduleError) console.error('Failed to update notification_schedule:', scheduleError)

    return new Response(
      JSON.stringify({ recommendation, sent }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 generate-ai-recommendation error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
