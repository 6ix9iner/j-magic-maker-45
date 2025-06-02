
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Google Generative AI with API key
// In production, this should be stored in environment variables or secure storage
const API_KEY = "AIzaSyA4R-hv8YurDE3t-kIcHPgQaq5imQ3kQKI";
const genAI = new GoogleGenerativeAI(API_KEY);

export interface ProductProfitability {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  total_cost: number;
  profit: number;
  profit_margin: number;
}

export interface SalesData {
  totalSales: number;
  totalProducts: number;
  recentOrders: number;
  lowStockCount: number;
  salesByDate: Array<{date: string; total: number; count: number}>;
  topProducts: Array<{product_name: string; total_quantity: number; total_revenue: number}>;
  // Enhanced financial data
  totalCosts: number;
  grossProfit: number;
  profitMargin: number;
  profitLossData: Array<{date: string; revenue: number; cost: number; profit: number}>;
  productProfitability: ProductProfitability[];
}

/**
 * Generate comprehensive AI insights including both business overview and profit/loss analysis
 */
export const generateAIInsights = async (salesData: SalesData): Promise<string[]> => {
  try {
    // Access the model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Format the data for the prompt
    const dataString = JSON.stringify(salesData, null, 2);
    
    const prompt = `
    You are a comprehensive business analytics AI that helps retail store owners understand their complete business performance.
    
    Please analyze the following sales, inventory, and financial data:
    
    ${dataString}
    
    Provide exactly 8 actionable insights covering these areas:
    
    1-2 insights on OVERALL BUSINESS PERFORMANCE (sales trends, growth, customer behavior)
    3-4 insights on PROFITABILITY & FINANCIAL HEALTH (profit margins, cost management, profitable products)
    5-6 insights on INVENTORY & OPERATIONS (stock levels, product performance, operational efficiency)
    7-8 insights on STRATEGIC RECOMMENDATIONS (specific actions to improve business, focus areas)
    
    Focus on:
    - Overall business health and trends
    - Product-level profit analysis (which products are most/least profitable)
    - Loss-making products or negative trends that need immediate attention
    - Revenue vs cost patterns and efficiency
    - Inventory management insights
    - Specific actionable recommendations with numbers when possible
    
    Each insight should be practical, specific, and include actual numbers from the data when relevant.
    
    Format your response as a JSON array of exactly 8 strings with no additional explanation or text outside the array.
    Example: ["Business insight with numbers", "Profit analysis insight", "Loss prevention insight", "Inventory insight", "Growth recommendation", "Cost optimization tip", "Product focus suggestion", "Strategic next step"]
    `;
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Parse the response as JSON
    try {
      // Extract JSON array from the response (handling potential text wrapping)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const insights = JSON.parse(jsonMatch[0]);
        return Array.isArray(insights) ? insights.slice(0, 8) : [];
      }
      return [];
    } catch (error) {
      console.error("Failed to parse AI insights:", error);
      // Enhanced fallback insights covering both business overview and profit/loss
      return [
        `Your business generated $${salesData.totalSales.toFixed(2)} in total sales with a ${salesData.profitMargin.toFixed(1)}% profit margin.`,
        `Gross profit stands at $${salesData.grossProfit.toFixed(2)} from $${salesData.totalCosts.toFixed(2)} in costs.`,
        `${salesData.productProfitability.length > 0 && salesData.productProfitability[0].profit > 0 ? `${salesData.productProfitability[0].product_name} is your most profitable product with $${salesData.productProfitability[0].profit.toFixed(2)} profit.` : 'Review product profitability to identify top performers.'}`,
        `${salesData.productProfitability.filter(p => p.profit < 0).length > 0 ? `${salesData.productProfitability.filter(p => p.profit < 0).length} products are currently losing money and need review.` : 'All products are currently profitable.'}`,
        `You have ${salesData.lowStockCount} low-stock items that need restocking attention.`,
        `Recent sales show ${salesData.recentOrders} orders with an average of $${(salesData.totalSales / Math.max(salesData.recentOrders, 1)).toFixed(2)} per transaction.`,
        `Focus on promoting high-margin products to maximize profitability.`,
        "Consider analyzing monthly profit trends to identify seasonal patterns and optimize inventory."
      ];
    }
  } catch (error) {
    console.error("Error generating AI insights:", error);
    // Enhanced fallback insights covering both business overview and profit/loss
    return [
      `Your business generated $${salesData.totalSales.toFixed(2)} in total sales with a ${salesData.profitMargin.toFixed(1)}% profit margin.`,
      `Gross profit stands at $${salesData.grossProfit.toFixed(2)} from $${salesData.totalCosts.toFixed(2)} in costs.`,
      `${salesData.productProfitability.length > 0 && salesData.productProfitability[0].profit > 0 ? `${salesData.productProfitability[0].product_name} is your most profitable product with $${salesData.productProfitability[0].profit.toFixed(2)} profit.` : 'Review product profitability to identify top performers.'}`,
      `${salesData.productProfitability.filter(p => p.profit < 0).length > 0 ? `${salesData.productProfitability.filter(p => p.profit < 0).length} products are currently losing money and need review.` : 'All products are currently profitable.'}`,
      `You have ${salesData.lowStockCount} low-stock items that need restocking attention.`,
      `Recent sales show ${salesData.recentOrders} orders with an average of $${(salesData.totalSales / Math.max(salesData.recentOrders, 1)).toFixed(2)} per transaction.`,
      `Focus on promoting high-margin products to maximize profitability.`,
      "Consider analyzing monthly profit trends to identify seasonal patterns and optimize inventory."
    ];
  }
};

/**
 * Generate chart recommendations based on sales data
 */
export const generateChartRecommendations = async (salesData: SalesData): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const dataString = JSON.stringify(salesData, null, 2);
    
    const prompt = `
    You are a data visualization expert. Based on the following sales and financial data:
    
    ${dataString}
    
    Suggest ONE specific chart type (beyond what might already be shown) that would be most valuable to add to this retail dashboard. Focus on charts that would help identify profit/loss patterns, product profitability, or financial trends.
    
    Keep your response under 100 characters.
    `;
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    return text.length > 100 ? text.substring(0, 100) + "..." : text;
  } catch (error) {
    console.error("Error generating chart recommendations:", error);
    return "Add a product profitability scatter plot to identify which items drive the most profit per sale.";
  }
};
