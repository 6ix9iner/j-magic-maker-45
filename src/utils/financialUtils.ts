
/**
 * Financial utility functions for calculating profit, loss, and other financial metrics
 */

export interface FinancialMetrics {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  revenueGrowth?: number;
  previousPeriodRevenue?: number;
}

/**
 * Calculate gross profit and profit margin from revenue and cost
 */
export const calculateProfitMetrics = (
  revenue: number,
  cost: number,
  previousRevenue?: number
): FinancialMetrics => {
  const grossProfit = revenue - cost;
  const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  
  let revenueGrowth: number | undefined;
  if (previousRevenue !== undefined && previousRevenue > 0) {
    revenueGrowth = ((revenue - previousRevenue) / previousRevenue) * 100;
  }
  
  return {
    totalRevenue: revenue,
    totalCost: cost,
    grossProfit,
    profitMargin,
    revenueGrowth,
    previousPeriodRevenue: previousRevenue
  };
};

/**
 * Format number as currency
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format number as percentage
 */
export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100);
};

/**
 * Calculate actual costs from sale items using purchase prices
 */
export const calculateActualCosts = async (saleItems: any[], supabase: any): Promise<number> => {
  let totalCost = 0;
  
  for (const item of saleItems) {
    // Get the product's purchase price
    const { data: product, error } = await supabase
      .from('products')
      .select('purchase_price')
      .eq('id', item.product_id)
      .single();
    
    if (product && !error) {
      totalCost += parseFloat(product.purchase_price.toString()) * item.quantity;
    }
  }
  
  return totalCost;
};

/**
 * Get appropriate color for profit/loss indicators
 */
export const getProfitLossColor = (value: number): string => {
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-600';
};
