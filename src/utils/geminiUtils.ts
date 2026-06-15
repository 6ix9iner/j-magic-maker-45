
import { supabase } from "@/integrations/supabase/client";

export interface ProductProfitability {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  total_cost: number;
  profit: number;
  profit_margin: number;
}

export interface SalesData {
  // Snapshot metadata
  reportGeneratedAt: string;       // ISO timestamp of when report was built
  currentDate: string;             // e.g. "Sunday, June 15 2026"
  currentTime: string;             // e.g. "19:54"

  // Core KPIs
  totalSales: number;
  totalProducts: number;
  recentOrders: number;            // last 7 days
  lowStockCount: number;

  // Detailed breakdowns
  salesByDate: Array<{date: string; total: number; count: number}>;
  monthlySalesTrend: Array<{date: string; total: number; count: number}>;
  topProducts: Array<{product_name: string; total_quantity: number; total_revenue: number}>;
  categorySales: Array<{category: string; value: number}>;
  lowStockProducts: Array<{name: string; stock_count: number}>;

  // Financials
  totalCosts: number;
  grossProfit: number;
  profitMargin: number;
  profitLossData: Array<{date: string; revenue: number; cost: number; profit: number}>;
  productProfitability: ProductProfitability[];
}

// Cache to prevent duplicate calls when generateAIInsights and generateChartRecommendations are called in parallel
let cachedPromise: Promise<{ insights: string[]; chartRecommendation: string }> | null = null;
let cachedSalesDataString = "";

const fetchDashboardInsights = async (salesData: SalesData) => {
  const salesDataString = JSON.stringify(salesData);
  
  if (cachedPromise && cachedSalesDataString === salesDataString) {
    return cachedPromise;
  }
  
  cachedSalesDataString = salesDataString;
  cachedPromise = (async () => {
    try {
      console.log("Fetching dashboard insights from Supabase Edge Function...");
      const { data, error } = await supabase.functions.invoke('dashboard-insights', {
        body: { salesData }
      });
      
      if (error) throw error;
      
      return {
        insights: data.insights || [],
        chartRecommendation: data.chartRecommendation || ""
      };
    } catch (error) {
      console.error("Failed to fetch dashboard insights from Edge Function:", error);
      
      const totalSales = salesData.totalSales || 0;
      const profitMargin = salesData.profitMargin || 0;
      const grossProfit = salesData.grossProfit || 0;
      const totalCosts = salesData.totalCosts || 0;
      const lowStockCount = salesData.lowStockCount || 0;
      
      return {
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
        chartRecommendation: "Add a product profitability scatter plot to identify which items drive the most profit per sale."
      };
    }
  })();
  
  return cachedPromise;
};

/**
 * Generate comprehensive AI insights including both business overview and profit/loss analysis
 */
export const generateAIInsights = async (salesData: SalesData): Promise<string[]> => {
  const result = await fetchDashboardInsights(salesData);
  return result.insights;
};

/**
 * Generate chart recommendations based on sales data
 */
export const generateChartRecommendations = async (salesData: SalesData): Promise<string> => {
  const result = await fetchDashboardInsights(salesData);
  return result.chartRecommendation;
};

