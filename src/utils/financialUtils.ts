
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

export interface ProductProfitability {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  total_cost: number;
  profit: number;
  profit_margin: number;
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
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
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
 * Calculate actual costs from sale items using purchase prices with better error handling
 */
export const calculateActualCosts = async (saleItems: any[], supabase: any): Promise<number> => {
  let totalCost = 0;
  
  // Group sale items by product_id to reduce database queries
  const productQuantityMap = new Map<string, number>();
  
  for (const item of saleItems) {
    if (!item.product_id) {
      console.warn('Sale item missing product_id:', item);
      continue;
    }
    
    const existingQuantity = productQuantityMap.get(item.product_id) || 0;
    productQuantityMap.set(item.product_id, existingQuantity + (item.quantity || 0));
  }
  
  console.log('Product quantities map:', Array.from(productQuantityMap.entries()));
  
  // Fetch all products at once
  const productIds = Array.from(productQuantityMap.keys());
  
  if (productIds.length === 0) {
    console.log('No valid product IDs found');
    return 0;
  }
  
  const { data: products, error } = await supabase
    .from('products')
    .select('id, purchase_price')
    .in('id', productIds);
  
  if (error) {
    console.error('Error fetching products for cost calculation:', error);
    return 0;
  }
  
  if (!products || products.length === 0) {
    console.log('No products found for cost calculation');
    return 0;
  }
  
  console.log('Products fetched for cost calculation:', products);
  
  // Calculate total cost
  for (const product of products) {
    const quantity = productQuantityMap.get(product.id) || 0;
    const purchasePrice = parseFloat(product.purchase_price?.toString() || '0');
    const productCost = purchasePrice * quantity;
    
    console.log(`Product ${product.id}: quantity=${quantity}, purchasePrice=$${purchasePrice}, cost=$${productCost}`);
    
    totalCost += productCost;
  }
  
  console.log('Total calculated cost:', totalCost);
  return totalCost;
};

/**
 * Calculate profitability for individual products
 */
export const calculateProductProfitability = async (supabase: any, userId: string): Promise<ProductProfitability[]> => {
  try {
    // Get all sale items with product details for the user
    const { data: saleItems, error } = await supabase
      .from('sale_items')
      .select(`
        name_at_sale,
        quantity,
        price_at_sale,
        product_id,
        sales!inner(user_id)
      `)
      .eq('sales.user_id', userId);

    if (error) {
      console.error('Error fetching sale items:', error);
      return [];
    }

    // Group by product and calculate profitability
    const productMap = new Map<string, {
      name: string;
      totalQuantity: number;
      totalRevenue: number;
      totalCost: number;
      productId: string;
    }>();

    // First pass: aggregate sales data
    for (const item of saleItems) {
      const productName = item.name_at_sale;
      const existing = productMap.get(productName) || {
        name: productName,
        totalQuantity: 0,
        totalRevenue: 0,
        totalCost: 0,
        productId: item.product_id
      };

      existing.totalQuantity += item.quantity;
      existing.totalRevenue += parseFloat(item.price_at_sale.toString()) * item.quantity;
      
      productMap.set(productName, existing);
    }

    // Second pass: get purchase prices and calculate costs
    const profitabilityData: ProductProfitability[] = [];
    
    for (const [productName, data] of productMap.entries()) {
      // Get the product's purchase price
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('purchase_price')
        .eq('id', data.productId)
        .single();

      let totalCost = 0;
      if (product && !productError) {
        totalCost = parseFloat(product.purchase_price.toString()) * data.totalQuantity;
      }

      const profit = data.totalRevenue - totalCost;
      const profitMargin = data.totalRevenue > 0 ? (profit / data.totalRevenue) * 100 : 0;

      profitabilityData.push({
        product_name: productName,
        total_quantity: data.totalQuantity,
        total_revenue: data.totalRevenue,
        total_cost: totalCost,
        profit,
        profit_margin: profitMargin
      });
    }

    // Sort by profit (highest first)
    return profitabilityData.sort((a, b) => b.profit - a.profit);
  } catch (error) {
    console.error('Error calculating product profitability:', error);
    return [];
  }
};

/**
 * Get appropriate color for profit/loss indicators
 */
export const getProfitLossColor = (value: number): string => {
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-600';
};
