
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
 * Generate AI insights based on sales and inventory data with profit/loss analysis
 */
export const generateAIInsights = async (salesData: SalesData): Promise<string[]> => {
  try {
    // Access the model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Format the data for the prompt
    const dataString = JSON.stringify(salesData, null, 2);
    
    const prompt = `
    You are a business analytics AI that helps retail store owners understand their sales data and profitability.
    
    Please analyze the following comprehensive sales, inventory, and financial data:
    
    ${dataString}
    
    Focus on providing actionable insights about:
    1. Overall profitability and financial health
    2. Product-level profit analysis (which products are most/least profitable)
    3. Loss-making products or trends that need attention
    4. Revenue vs cost trends over time
    5. Specific recommendations for improving profitability
    
    Provide exactly 5 short, actionable insights. Each insight should be a single sentence that's practical and specific. Include actual numbers when relevant (profit margins, specific products, amounts).
    
    Format your response as a JSON array of strings with no additional explanation or text outside the array.
    Example: ["Your business has a healthy 25% profit margin overall", "Product X is your most profitable with 40% margin", "Consider discontinuing Product Y as it's losing $50 per sale", "Monthly profits are trending upward by 15%", "Focus on promoting high-margin products like Product Z"]
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
        return Array.isArray(insights) ? insights.slice(0, 5) : [];
      }
      return [];
    } catch (error) {
      console.error("Failed to parse AI insights:", error);
      // Enhanced fallback insights with profit/loss focus
      return [
        `Your business shows a ${salesData.profitMargin.toFixed(1)}% profit margin with $${salesData.grossProfit.toFixed(2)} gross profit.`,
        `${salesData.productProfitability.length > 0 ? salesData.productProfitability[0].product_name : 'Top product'} is your most profitable item.`,
        `Consider reviewing products with negative margins to improve overall profitability.`,
        `Monthly profit trends ${salesData.profitLossData.length > 1 && salesData.profitLossData[salesData.profitLossData.length - 1].profit > salesData.profitLossData[salesData.profitLossData.length - 2].profit ? 'are improving' : 'need attention'}.`,
        "Focus on promoting high-margin products to maximize profitability."
      ];
    }
  } catch (error) {
    console.error("Error generating AI insights:", error);
    // Enhanced fallback insights with profit/loss focus
    return [
      `Your business shows a ${salesData.profitMargin.toFixed(1)}% profit margin with $${salesData.grossProfit.toFixed(2)} gross profit.`,
      `${salesData.productProfitability.length > 0 ? salesData.productProfitability[0].product_name : 'Top product'} is your most profitable item.`,
      `Consider reviewing products with negative margins to improve overall profitability.`,
      `Monthly profit trends ${salesData.profitLossData.length > 1 && salesData.profitLossData[salesData.profitLossData.length - 1].profit > salesData.profitLossData[salesData.profitLossData.length - 2].profit ? 'are improving' : 'need attention'}.`,
      "Focus on promoting high-margin products to maximize profitability."
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
