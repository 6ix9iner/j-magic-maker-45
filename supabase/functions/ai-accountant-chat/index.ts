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

    // Fetch store metrics in parallel
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [productsRes, salesRes, lowStockRes, saleItemsRes] = await Promise.all([
      supabaseClient.from('products').select('name, price, purchase_price, stock_count, category'),
      supabaseClient.from('sales').select('total_amount, created_at'),
      supabaseClient.from('products').select('name, stock_count').lt('stock_count', 5),
      supabaseClient.from('sale_items')
        .select('name_at_sale, price_at_sale, quantity, created_at, sales!inner(user_id)')
        .eq('sales.user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
    ])

    const products = productsRes.data || []
    const sales = salesRes.data || []
    const lowStock = lowStockRes.data || []
    const saleItems = saleItemsRes.data || []

    // Calculate metrics
    const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0)
    
    const productPriceMap = new Map()
    products.forEach(p => {
      productPriceMap.set(p.name, parseFloat(p.purchase_price || 0))
    })

    let totalCost30Days = 0
    let totalRevenue30Days = 0
    const productProfitMap = new Map()

    saleItems.forEach(item => {
      const qty = item.quantity || 0
      const price = parseFloat(item.price_at_sale || 0)
      const revenue = price * qty
      
      const purchasePrice = productPriceMap.get(item.name_at_sale) || 0
      const cost = purchasePrice * qty

      totalRevenue30Days += revenue
      totalCost30Days += cost

      const existing = productProfitMap.get(item.name_at_sale) || { quantity: 0, revenue: 0, cost: 0 }
      productProfitMap.set(item.name_at_sale, {
        quantity: existing.quantity + qty,
        revenue: existing.revenue + revenue,
        cost: existing.cost + cost
      })
    })

    const profit30Days = totalRevenue30Days - totalCost30Days
    const margin30Days = totalRevenue30Days > 0 ? (profit30Days / totalRevenue30Days) * 100 : 0

    const topProducts = Array.from(productProfitMap.entries())
      .map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: data.revenue,
        profit: data.revenue - data.cost,
        margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Build a conversational system prompt
    const systemPrompt = `You are an AI Business Accountant named "Insight". You are friendly, conversational, and approachable — like a knowledgeable business partner chatting with the store owner.

IMPORTANT BEHAVIORAL RULES:
- Be CONVERSATIONAL first. If the user says "hi", "hello", "how are you", "thanks", or makes casual chat, respond naturally and warmly like a friend. Do NOT dump data or analysis unprompted.
- Only reference business data when the user ASKS a question about their business (e.g. "how are my sales?", "what's my profit?", "which products sell best?").
- When the user asks a vague question like "how's business?", give a brief friendly summary — not a full report. Let them ask follow-up questions.
- Keep responses concise. Use short paragraphs. Only use tables or detailed breakdowns when the user specifically asks for details.
- Remember the conversation context from previous messages. If the user follows up on something, continue naturally.
- Use Markdown formatting when helpful, but don't overdo it for casual replies.
- Refer to currency in Nigerian Naira (₦).

You have access to the merchant's live store data (shown below). Use it ONLY when relevant to what the user is asking:

STORE METRICS:
- Total Revenue (All time): ₦${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Total Transactions: ${sales.length}
- Active Products: ${products.length}

LAST 30 DAYS:
- Revenue: ₦${totalRevenue30Days.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- COGS: ₦${totalCost30Days.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Gross Profit: ₦${profit30Days.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Profit Margin: ${margin30Days.toFixed(1)}%

TOP 5 PRODUCTS (LAST 30 DAYS):
${topProducts.map((p, idx) => `${idx + 1}. ${p.name}: Qty ${p.quantity}, Revenue ₦${p.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}, Profit ₦${p.profit.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${p.margin.toFixed(1)}% margin)`).join('\n')}

LOW STOCK (< 5 items):
${lowStock.length > 0 ? lowStock.map(p => `- ${p.name}: ${p.stock_count} left`).join('\n') : "All items well stocked."}`

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
