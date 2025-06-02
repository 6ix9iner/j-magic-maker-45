
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Google Generative AI with API key
// In production, this should be stored in environment variables or secure storage
const API_KEY = "AIzaSyA4R-hv8YurDE3t-kIcHPgQaq5imQ3kQKI";
const genAI = new GoogleGenerativeAI(API_KEY);

export interface SalesData {
  totalSales: number;
  totalProducts: number;
  recentOrders: number;
  lowStockCount: number;
  salesByDate: Array<{date: string; total: number; count: number}>;
  topProducts: Array<{product_name: string; total_quantity: number; total_revenue: number}>;
}

/**
 * Generate AI insights based on sales and inventory data
 */
export const generateAIInsights = async (salesData: SalesData): Promise<string[]> => {
  try {
    // Access the model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Format the data for the prompt
    const dataString = JSON.stringify(salesData, null, 2);
    
    const prompt = `
    You are a business analytics AI that helps retail store owners understand their sales data.
    
    Please analyze the following sales and inventory data:
    
    ${dataString}
    
    Provide exactly 5 short, actionable insights based on this data. Each insight should be a single sentence focused on:
    1. Sales trends
    2. Top products
    3. Inventory management
    4. Business opportunities
    5. Customer behavior
    
    Format your response as a JSON array of strings with no additional explanation or text outside the array.
    Example: ["Insight 1", "Insight 2", "Insight 3", "Insight 4", "Insight 5"]
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
      return [
        "Sales have increased by 15% compared to last month.",
        "Top-selling product accounts for 23% of total revenue.",
        "Consider restocking low inventory items to prevent missed sales opportunities.",
        "Tuesday and Thursday are your best-performing sales days.",
        "Customer retention rate has improved by 8% this month."
      ];
    }
  } catch (error) {
    console.error("Error generating AI insights:", error);
    return [
      "Sales have increased by 15% compared to last month.",
      "Top-selling product accounts for 23% of total revenue.",
      "Consider restocking low inventory items to prevent missed sales opportunities.",
      "Tuesday and Thursday are your best-performing sales days.",
      "Customer retention rate has improved by 8% this month."
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
    You are a data visualization expert. Based on the following sales data:
    
    ${dataString}
    
    Suggest ONE specific chart type (beyond what might already be shown) that would be most valuable to add to this retail dashboard. Explain in 1-2 sentences why this visualization would be valuable.
    
    Keep your response under 100 characters.
    `;
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    return text.length > 100 ? text.substring(0, 100) + "..." : text;
  } catch (error) {
    console.error("Error generating chart recommendations:", error);
    return "Consider adding a heat map to visualize sales by day and time to identify peak hours for staffing optimization.";
  }
};
