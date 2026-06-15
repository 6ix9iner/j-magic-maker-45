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

    // Parse request body containing sales metrics
    const { salesData } = await req.json()
    if (!salesData) {
      return new Response(
        JSON.stringify({ error: 'salesData is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📊 Generating AI Dashboard insights for user: ${user.id}`)

    const now = new Date().toISOString()

    const prompt = `
You are a business analytics and data visualization expert.
Today's date and time: ${salesData.currentDate || new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${salesData.currentTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
Report generated at: ${salesData.reportGeneratedAt || now}

Based on the following comprehensive sales, inventory, and financial data of a retail store (prices in Nigerian Naira ₦):

=== CORE BUSINESS KPIs ===
- Total Revenue (All Time): ₦${(salesData.totalSales || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Total Products in Inventory: ${salesData.totalProducts || 0}
- Orders in Last 7 Days: ${salesData.recentOrders || 0}
- Low Stock Items (< 5 units): ${salesData.lowStockCount || 0}

=== FINANCIAL HEALTH ===
- Total Costs (COGS): ₦${(salesData.totalCosts || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Gross Profit: ₦${(salesData.grossProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Profit Margin: ${(salesData.profitMargin || 0).toFixed(2)}%

=== DAILY SALES (LAST 7 DAYS) ===
${JSON.stringify(salesData.salesByDate || [], null, 2)}

=== MONTHLY SALES TREND (LAST 6 MONTHS) ===
${JSON.stringify(salesData.monthlySalesTrend || [], null, 2)}

=== MONTHLY PROFIT / LOSS BREAKDOWN ===
${JSON.stringify(salesData.profitLossData || [], null, 2)}

=== TOP PRODUCTS BY REVENUE ===
${JSON.stringify(salesData.topProducts || [], null, 2)}

=== FULL PRODUCT PROFITABILITY ===
${JSON.stringify(salesData.productProfitability || [], null, 2)}

=== SALES BY CATEGORY ===
${JSON.stringify(salesData.categorySales || [], null, 2)}

=== LOW STOCK PRODUCTS (NEED RESTOCKING) ===
${salesData.lowStockProducts && salesData.lowStockProducts.length > 0
  ? salesData.lowStockProducts.map((p: any) => `- ${p.name}: ${p.stock_count} units left`).join('\n')
  : 'All items are well stocked.'}

Please provide two outputs in a single JSON response:
1. "insights": An array of exactly 8 strings (insights). Each insight must be specific, practical, and contain actual numbers from the data when relevant. Cover these areas:
   - 1-2 insights on OVERALL BUSINESS PERFORMANCE (sales trends, growth, recent orders vs historical)
   - 3-4 insights on PROFITABILITY & FINANCIAL HEALTH (profit margins, COGS, most/least profitable products, monthly trends)
   - 5-6 insights on INVENTORY & OPERATIONS (stock levels, which specific products are low, category performance, top sellers)
   - 7-8 insights on STRATEGIC RECOMMENDATIONS (specific, actionable steps to improve this particular business given its data)
   - Reference specific product names, exact figures, and date-based patterns where available.
   - Refer to all currency values in Nigerian Naira (NGN / ₦).
2. "chartRecommendation": A string under 100 characters suggesting ONE specific chart type that would be most valuable to add to this retail dashboard to help identify profit/loss patterns, product profitability, or financial trends.

Format your response as a valid JSON object with keys "insights" and "chartRecommendation". Output only the JSON. Do not include markdown block wrappers (like \`\`\`json) or any explanation.
`

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
        messages: [
          { role: 'system', content: 'You are a precise data analysis assistant.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      })
    })

    if (!qwenResponse.ok) {
      const errorText = await qwenResponse.text()
      console.error('Qwen API error:', errorText)
      throw new Error(`Qwen API responded with status ${qwenResponse.status}`)
    }

    const qwenData = await qwenResponse.json()
    const reply = qwenData.choices?.[0]?.message?.content || '{}'

    let responseData
    try {
      // Extract JSON from potential code block wrapping
      const jsonMatch = reply.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        responseData = JSON.parse(jsonMatch[0])
      } else {
        responseData = JSON.parse(reply)
      }

      // Ensure formatting is correct
      if (!Array.isArray(responseData.insights) || responseData.insights.length !== 8) {
        throw new Error('Insights response does not contain exactly 8 elements')
      }
    } catch (parseError) {
      console.warn('⚠️ Parse warning or format issue, using fallback calculation:', parseError, 'Raw response:', reply)
      
      const totalSales = parseFloat(salesData.totalSales || 0)
      const profitMargin = parseFloat(salesData.profitMargin || 0)
      const grossProfit = parseFloat(salesData.grossProfit || 0)
      const totalCosts = parseFloat(salesData.totalCosts || 0)
      const lowStockCount = parseInt(salesData.lowStockCount || 0)
      
      responseData = {
        insights: [
          `Your business generated ₦${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} in total sales with a ${profitMargin.toFixed(1)}% profit margin.`,
          `Gross profit stands at ₦${grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })} from ₦${totalCosts.toLocaleString('en-US', { minimumFractionDigits: 2 })} in costs.`,
          `${salesData.productProfitability && salesData.productProfitability.length > 0 && salesData.productProfitability[0].profit > 0 ? `${salesData.productProfitability[0].product_name} is your most profitable product with ₦${salesData.productProfitability[0].profit.toLocaleString('en-US', { minimumFractionDigits: 2 })} profit.` : 'Review product profitability to identify top performers.'}`,
          `You have ${lowStockCount} low-stock items that need restocking attention.`,
          `Recent sales show ${salesData.recentOrders} orders with an average of ₦${(totalSales / Math.max(salesData.recentOrders, 1)).toLocaleString('en-US', { minimumFractionDigits: 2 })} per transaction.`,
          `Focus on promoting high-margin products to maximize profitability.`,
          `Consider analyzing monthly profit trends to identify seasonal patterns and optimize inventory.`,
          `Ensure adequate stocking of high-demand items to prevent stockouts.`
        ],
        chartRecommendation: 'Add a product profitability scatter plot to identify which items drive the most profit per sale.'
      }
    }

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 AI Insights edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
