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
    // Authenticate caller
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
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized user session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body — accepts message + optional conversation history
    const { message, history } = await req.json()
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🤖 AI Accountant request for user: ${user.id}, query: "${message}"`)

    // Get current date/time context
    const now = new Date()
    const currentDateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const currentTimeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(now.getDate() - 30)
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(now.getDate() - 7)

    // Fetch ALL business data in parallel for full context
    const [productsRes, allSalesRes, lowStockRes, todaySalesRes, week7SalesRes, saleItemsAllRes, saleItems30Res] = await Promise.all([
      // Full product catalogue with all fields
      supabaseClient.from('products')
        .select('name, price, purchase_price, stock_count, category, barcode')
        .eq('user_id', user.id),

      // ALL sales ever (for total revenue, transaction count, history)
      supabaseClient.from('sales')
        .select('id, total_amount, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),

      // Low stock (< 5 units)
      supabaseClient.from('products')
        .select('name, stock_count, category')
        .eq('user_id', user.id)
        .lt('stock_count', 5),

      // Today's sales
      supabaseClient.from('sales')
        .select('id, total_amount, created_at')
        .eq('user_id', user.id)
        .gte('created_at', todayStart),

      // Last 7 days sales
      supabaseClient.from('sales')
        .select('id, total_amount, created_at')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString()),

      // ALL sale items ever (for full profitability picture)
      supabaseClient.from('sale_items')
        .select('name_at_sale, price_at_sale, quantity, created_at, product_id, sales!inner(user_id, created_at)')
        .eq('sales.user_id', user.id),

      // Last 30 days sale items (for recent product performance)
      supabaseClient.from('sale_items')
        .select('name_at_sale, price_at_sale, quantity, created_at, sales!inner(user_id)')
        .eq('sales.user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString()),
    ])

    const products = productsRes.data || []
    const allSales = allSalesRes.data || []
    const lowStock = lowStockRes.data || []
    const todaySales = todaySalesRes.data || []
    const week7Sales = week7SalesRes.data || []
    const allSaleItems = saleItemsAllRes.data || []
    const saleItems30 = saleItems30Res.data || []

    // Build purchase price map
    const productPriceMap = new Map<string, number>()
    const productCategoryMap = new Map<string, string>()
    products.forEach((p: any) => {
      productPriceMap.set(p.name, parseFloat(p.purchase_price || 0))
      productCategoryMap.set(p.name, p.category || 'Uncategorised')
    })

    // --- All-time totals ---
    const totalRevenue = allSales.reduce((sum: number, s: any) => sum + parseFloat(s.total_amount || 0), 0)
    let totalCostAllTime = 0
    allSaleItems.forEach((item: any) => {
      totalCostAllTime += (productPriceMap.get(item.name_at_sale) || 0) * (item.quantity || 0)
    })
    const grossProfitAllTime = totalRevenue - totalCostAllTime
    const marginAllTime = totalRevenue > 0 ? (grossProfitAllTime / totalRevenue) * 100 : 0

    // --- Today totals ---
    const todayRevenue = todaySales.reduce((sum: number, s: any) => sum + parseFloat(s.total_amount || 0), 0)

    // --- Last 7 days totals ---
    const week7Revenue = week7Sales.reduce((sum: number, s: any) => sum + parseFloat(s.total_amount || 0), 0)

    // --- Last 30 days product breakdown ---
    let revenue30 = 0, cost30 = 0
    const productMap30 = new Map<string, any>()
    const categoryMap30 = new Map<string, number>()
    saleItems30.forEach((item: any) => {
      const qty = item.quantity || 0
      const price = parseFloat(item.price_at_sale || 0)
      const rev = price * qty
      const cost = (productPriceMap.get(item.name_at_sale) || 0) * qty
      revenue30 += rev
      cost30 += cost
      const cat = productCategoryMap.get(item.name_at_sale) || 'Uncategorised'
      categoryMap30.set(cat, (categoryMap30.get(cat) || 0) + rev)
      const ex = productMap30.get(item.name_at_sale) || { qty: 0, revenue: 0, cost: 0 }
      productMap30.set(item.name_at_sale, { qty: ex.qty + qty, revenue: ex.revenue + rev, cost: ex.cost + cost })
    })
    const profit30 = revenue30 - cost30
    const margin30 = revenue30 > 0 ? (profit30 / revenue30) * 100 : 0

    const topProducts30 = Array.from(productMap30.entries())
      .map(([name, d]) => ({ name, quantity: d.qty, revenue: d.revenue, cost: d.cost, profit: d.revenue - d.cost, margin: d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue) * 100 : 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    const categorySales30 = Array.from(categoryMap30.entries())
      .map(([cat, val]) => ({ category: cat, revenue: val }))
      .sort((a, b) => b.revenue - a.revenue)

    // --- Daily sales for last 7 days ---
    const dailyMap = new Map<string, { revenue: number; orders: number }>()
    week7Sales.forEach((s: any) => {
      const day = new Date(s.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const ex = dailyMap.get(day) || { revenue: 0, orders: 0 }
      dailyMap.set(day, { revenue: ex.revenue + parseFloat(s.total_amount || 0), orders: ex.orders + 1 })
    })
    const dailySales7 = Array.from(dailyMap.entries()).map(([date, d]) => ({ date, ...d }))

    // Build a conversational system prompt with complete data
    const systemPrompt = `You are an AI Business Accountant named "Insight". You are friendly, conversational, and approachable — like a knowledgeable business partner chatting with the store owner.

CURRENT DATE & TIME: ${currentDateStr} at ${currentTimeStr}

IMPORTANT BEHAVIORAL RULES:
- Be CONVERSATIONAL first. If the user says "hi", "hello", "how are you", "thanks", or makes casual chat, respond naturally and warmly like a friend. Do NOT dump data or analysis unprompted.
- Only reference business data when the user ASKS a question about their business (e.g. "how are my sales?", "what's my profit?", "which products sell best?").
- When the user asks a vague question like "how's business?", give a brief friendly summary — not a full report. Let them ask follow-up questions.
- Keep responses concise. Use short paragraphs. Only use tables or detailed breakdowns when the user specifically asks for details.
- Remember the conversation context from previous messages. If the user follows up on something, continue naturally.
- Use Markdown formatting when helpful, but don't overdo it for casual replies.
- Refer to all currency in Nigerian Naira (₦).
- You know exactly what today's date and time is — use it when answering time-sensitive questions like "what did I sell today?" or "how was yesterday?".

You have COMPLETE ACCESS to the merchant's live store data. Use it ONLY when relevant:

═══ ALL-TIME BUSINESS SUMMARY ═══
- Total Revenue: ₦${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Total Transactions: ${allSales.length}
- Total COGS: ₦${totalCostAllTime.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Gross Profit: ₦${grossProfitAllTime.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Profit Margin: ${marginAllTime.toFixed(1)}%
- Active Products: ${products.length}

═══ TODAY (${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}) ═══
- Revenue: ₦${todayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Orders: ${todaySales.length}

═══ LAST 7 DAYS ═══
- Revenue: ₦${week7Revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Orders: ${week7Sales.length}
- Daily Breakdown:
${dailySales7.map(d => `  • ${d.date}: ₦${d.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${d.orders} orders)`).join('\n') || '  No sales this week.'}

═══ LAST 30 DAYS ═══
- Revenue: ₦${revenue30.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- COGS: ₦${cost30.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Gross Profit: ₦${profit30.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Profit Margin: ${margin30.toFixed(1)}%

TOP 10 PRODUCTS (LAST 30 DAYS):
${topProducts30.map((p, i) => `${i + 1}. ${p.name}: Qty ${p.quantity} | Revenue ₦${p.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Profit ₦${p.profit.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${p.margin.toFixed(1)}%)`).join('\n') || 'No data.'}

SALES BY CATEGORY (LAST 30 DAYS):
${categorySales30.map(c => `• ${c.category}: ₦${c.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`).join('\n') || 'No category data.'}

═══ FULL INVENTORY (${products.length} products) ═══
${products.map((p: any) => `• ${p.name} | Selling: ₦${parseFloat(p.price || 0).toLocaleString()} | Cost: ₦${parseFloat(p.purchase_price || 0).toLocaleString()} | Stock: ${p.stock_count} | Category: ${p.category || 'None'}`).join('\n') || 'No products.'}

═══ LOW STOCK ALERTS (< 5 units) ═══
${lowStock.length > 0 ? lowStock.map((p: any) => `⚠️ ${p.name} (${p.category || 'No category'}): ${p.stock_count} left`).join('\n') : '✅ All items are well stocked.'}`

    // Build conversation messages array with history
    const conversationMessages = [
      { role: 'system', content: systemPrompt }
    ]

    // Add conversation history if provided (last 10 messages to keep context manageable)
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-10)
      for (const msg of recentHistory) {
        conversationMessages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        })
      }
    }

    // Add the current user message
    conversationMessages.push({ role: 'user', content: message })

    // Call Qwen 3.7 Max API
    const QWEN_API_KEY = Deno.env.get('QWEN_API_KEY') || 'sk-ws-H.HRYRXI.YGas.MEUCIQCjhjsLgbLABxARSY6wP2fKJy3rKoZHPdTjIYfFedD3hgIgHe1JRzdDexdL3cUZf_UT8JJDljoN_otpRdFYGiZLOds'
    const QWEN_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions'

    const qwenResponse = await fetch(QWEN_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${QWEN_API_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen3.7-max',
        messages: conversationMessages,
        temperature: 0.7
      })
    })

    if (!qwenResponse.ok) {
      const errorText = await qwenResponse.text()
      console.error('Qwen API error:', errorText)
      throw new Error(`Qwen API responded with status ${qwenResponse.status}`)
    }

    const qwenData = await qwenResponse.json()
    const reply = qwenData.choices?.[0]?.message?.content || 'I could not generate a response.'

    return new Response(
      JSON.stringify({ response: reply }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 AI Accountant edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
