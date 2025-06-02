
import { useState } from 'react';
import { generateAIInsights, generateChartRecommendations, SalesData } from '@/utils/geminiUtils';
import { toast } from 'sonner';
import { DashboardData } from './useDashboardData';

export const useAIInsights = () => {
  const [aiInsights, setAiInsights] = useState<string[]>(["Click 'Get AI Insights' to analyze your business data"]);
  const [chartRecommendation, setChartRecommendation] = useState<string>("");
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);

  const generateInsights = async (dashboardData: DashboardData) => {
    setIsLoadingAI(true);
    try {
      const salesDataForAI: SalesData = {
        totalSales: dashboardData.totalSales,
        totalProducts: dashboardData.totalProducts,
        recentOrders: dashboardData.salesByDate.reduce((sum, day) => sum + day.count, 0),
        lowStockCount: dashboardData.lowStockCount,
        salesByDate: dashboardData.salesByDate,
        topProducts: dashboardData.topProducts,
        totalCosts: dashboardData.financialMetrics.totalCost,
        grossProfit: dashboardData.financialMetrics.grossProfit,
        profitMargin: dashboardData.financialMetrics.profitMargin,
        profitLossData: dashboardData.profitLossData,
        productProfitability: dashboardData.productProfitability
      };

      // Generate insights in parallel for better performance
      const [insights, recommendation] = await Promise.all([
        generateAIInsights(salesDataForAI),
        generateChartRecommendations(salesDataForAI)
      ]);
      
      setAiInsights(insights);
      setChartRecommendation(recommendation);
      toast.success("AI insights generated successfully");
    } catch (error) {
      console.error("Failed to generate AI insights:", error);
      toast.error("Failed to generate insights");
      
      // Fallback insights
      setAiInsights([
        `Your business generated $${dashboardData.totalSales.toFixed(2)} in total sales with a ${dashboardData.financialMetrics.profitMargin.toFixed(1)}% profit margin.`,
        `Gross profit stands at $${dashboardData.financialMetrics.grossProfit.toFixed(2)} from $${dashboardData.financialMetrics.totalCost.toFixed(2)} in costs.`,
        `${dashboardData.productProfitability.length > 0 && dashboardData.productProfitability[0].profit > 0 ? `${dashboardData.productProfitability[0].product_name} is your most profitable product.` : 'Review product profitability to identify top performers.'}`,
        `You have ${dashboardData.lowStockCount} low-stock items that need restocking attention.`,
        `Recent sales show ${dashboardData.salesByDate.reduce((sum, day) => sum + day.count, 0)} orders.`,
        "Focus on promoting high-margin products to maximize profitability.",
        "Consider analyzing monthly profit trends to identify seasonal patterns.",
        "Monitor inventory levels to avoid stockouts of popular items."
      ]);
    } finally {
      setIsLoadingAI(false);
    }
  };

  return {
    aiInsights,
    chartRecommendation,
    isLoadingAI,
    generateInsights
  };
};
