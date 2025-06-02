
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculateActualCosts, calculateProductProfitability, calculateProfitMetrics, FinancialMetrics, ProductProfitability } from '@/utils/financialUtils';
import { toast } from 'sonner';

export interface SaleSummary {
  date: string;
  total: number;
  count: number;
}

export interface ProductSale {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}

export interface LowStockProduct {
  id: string;
  name: string;
  stock_count: number;
  barcode: string;
}

export interface CategorySale {
  category: string;
  value: number;
  color?: string;
}

export interface ProfitLossData {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface DashboardData {
  salesByDate: SaleSummary[];
  topProducts: ProductSale[];
  totalSales: number;
  totalProducts: number;
  lowStockCount: number;
  lowStockProducts: LowStockProduct[];
  categorySales: CategorySale[];
  monthlySalesTrend: SaleSummary[];
  profitLossData: ProfitLossData[];
  financialMetrics: FinancialMetrics;
  productProfitability: ProductProfitability[];
}

const fetchDashboardData = async (userId: string): Promise<DashboardData> => {
  console.log('Fetching dashboard data for user:', userId);
  
  try {
    // Parallel queries for better performance
    const [
      salesData,
      salesByDateData,
      topProductsData,
      productsCount,
      lowStockProductsData,
      categoryData
    ] = await Promise.all([
      // Total sales
      supabase.from('sales').select('total_amount').eq('user_id', userId),
      // Sales by date (last 7 days)
      supabase.from('sales')
        .select('created_at, total_amount')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      // Top products
      supabase.from('sale_items')
        .select(`name_at_sale, quantity, price_at_sale, sales!inner(user_id)`)
        .eq('sales.user_id', userId)
        .limit(50),
      // Products count
      supabase.from('products')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      // Low stock products
      supabase.from('products')
        .select('id, name, stock_count, barcode')
        .eq('user_id', userId)
        .lt('stock_count', 5),
      // Category data
      supabase.from('sale_items')
        .select(`name_at_sale, price_at_sale, quantity, sales!inner(user_id), products!inner(category)`)
        .eq('sales.user_id', userId)
        .not('products.category', 'is', null)
    ]);

    console.log('API responses received:', {
      salesData: salesData.data?.length || 0,
      salesByDateData: salesByDateData.data?.length || 0,
      topProductsData: topProductsData.data?.length || 0,
      productsCount: productsCount.count,
      lowStockProductsData: lowStockProductsData.data?.length || 0,
      categoryData: categoryData.data?.length || 0
    });

    if (salesData.error) {
      console.error('Sales data error:', salesData.error);
      throw salesData.error;
    }
    
    // Process data efficiently
    const totalSalesAmount = salesData.data?.reduce((sum, sale) => 
      sum + parseFloat(sale.total_amount.toString()), 0) || 0;

    // Process sales by date
    const salesByDateMap = new Map<string, SaleSummary>();
    salesByDateData.data?.forEach(sale => {
      const date = new Date(sale.created_at).toLocaleDateString();
      const existing = salesByDateMap.get(date) || { date, total: 0, count: 0 };
      salesByDateMap.set(date, {
        date,
        total: existing.total + parseFloat(sale.total_amount.toString()),
        count: existing.count + 1
      });
    });

    // Process top products
    const productMap = new Map<string, ProductSale>();
    topProductsData.data?.forEach(item => {
      const productName = item.name_at_sale;
      const existing = productMap.get(productName) || { 
        product_name: productName, 
        total_quantity: 0, 
        total_revenue: 0 
      };
      productMap.set(productName, {
        product_name: productName,
        total_quantity: existing.total_quantity + item.quantity,
        total_revenue: existing.total_revenue + (parseFloat(item.price_at_sale.toString()) * item.quantity)
      });
    });

    const topProductsList = Array.from(productMap.values())
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 5);

    // Get monthly sales data for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const { data: monthlySalesData } = await supabase
      .from('sales')
      .select('created_at, total_amount')
      .eq('user_id', userId)
      .gte('created_at', sixMonthsAgo.toISOString());

    // Process monthly sales data with proper date formatting
    const monthlySalesMap = new Map<string, SaleSummary>();
    monthlySalesData?.forEach(sale => {
      const saleDate = new Date(sale.created_at);
      // Ensure we get consistent month formatting
      const monthKey = `${saleDate.toLocaleDateString('en-US', { month: 'short' })} ${saleDate.getFullYear()}`;
      const existing = monthlySalesMap.get(monthKey) || { date: monthKey, total: 0, count: 0 };
      monthlySalesMap.set(monthKey, {
        date: monthKey,
        total: existing.total + parseFloat(sale.total_amount.toString()),
        count: existing.count + 1
      });
    });

    // Create array of last 6 months with consistent formatting
    const monthlyTrendData: SaleSummary[] = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentDate);
      monthDate.setMonth(currentDate.getMonth() - i);
      const monthKey = `${monthDate.toLocaleDateString('en-US', { month: 'short' })} ${monthDate.getFullYear()}`;
      
      const existingData = monthlySalesMap.get(monthKey);
      monthlyTrendData.push(existingData || { date: monthKey, total: 0, count: 0 });
    }

    console.log('Monthly trend data with consistent formatting:', monthlyTrendData);

    console.log('Processing profitability data...');
    
    // Calculate profitability and financial metrics with error handling
    let profitabilityData: ProductProfitability[] = [];
    try {
      profitabilityData = await calculateProductProfitability(supabase, userId);
    } catch (error) {
      console.error('Error calculating profitability:', error);
      // Continue with empty array if profitability calculation fails
    }
    
    // Calculate actual costs for profit/loss data with better error handling
    const profitLossItems: ProfitLossData[] = [];
    for (const monthData of monthlyTrendData) {
      const revenue = monthData.total;
      
      // Parse the month string properly
      const [monthName, year] = monthData.date.split(' ');
      const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
      
      const monthStart = new Date(parseInt(year), monthIndex, 1);
      const monthEnd = new Date(parseInt(year), monthIndex + 1, 1);
      
      console.log(`Processing month: ${monthData.date}, Start: ${monthStart.toISOString()}, End: ${monthEnd.toISOString()}`);
      
      try {
        const { data: monthSaleItems, error: saleItemsError } = await supabase
          .from('sale_items')
          .select(`quantity, product_id, sales!inner(created_at, user_id)`)
          .eq('sales.user_id', userId)
          .gte('sales.created_at', monthStart.toISOString())
          .lt('sales.created_at', monthEnd.toISOString());
        
        if (saleItemsError) {
          console.error('Error fetching sale items for month:', monthData.date, saleItemsError);
          throw saleItemsError;
        }
        
        let actualCost = 0;
        if (monthSaleItems && monthSaleItems.length > 0) {
          console.log(`Found ${monthSaleItems.length} sale items for ${monthData.date}`);
          actualCost = await calculateActualCosts(monthSaleItems, supabase);
          console.log(`Calculated cost for ${monthData.date}: $${actualCost}`);
        } else {
          console.log(`No sale items found for ${monthData.date}`);
        }
        
        const profit = revenue - actualCost;
        
        profitLossItems.push({
          date: monthData.date,
          revenue,
          cost: actualCost,
          profit
        });
        
        console.log(`Month ${monthData.date}: Revenue=$${revenue}, Cost=$${actualCost}, Profit=$${profit}`);
      } catch (error) {
        console.error('Error calculating costs for month:', monthData.date, error);
        // Add month with zero cost if calculation fails
        profitLossItems.push({
          date: monthData.date,
          revenue,
          cost: 0,
          profit: revenue
        });
      }
    }

    console.log('Final profit/loss data:', profitLossItems);

    // Calculate overall financial metrics with error handling
    let totalActualCost = 0;
    try {
      const { data: allSaleItems } = await supabase
        .from('sale_items')
        .select(`quantity, product_id, sales!inner(user_id)`)
        .eq('sales.user_id', userId);
      
      if (allSaleItems && allSaleItems.length > 0) {
        totalActualCost = await calculateActualCosts(allSaleItems, supabase);
        console.log('Total actual cost calculated:', totalActualCost);
      }
    } catch (error) {
      console.error('Error calculating total actual cost:', error);
      // Continue with zero cost if calculation fails
    }
    
    const currentMonthRevenue = profitLossItems.length > 0 ? profitLossItems[profitLossItems.length - 1].revenue : 0;
    const previousMonthRevenue = profitLossItems.length > 1 ? profitLossItems[profitLossItems.length - 2].revenue : undefined;
    
    const financialMetrics = calculateProfitMetrics(totalSalesAmount, totalActualCost, previousMonthRevenue);

    // Process category sales with colors
    const CATEGORY_COLORS = {
      'Electronics': '#0088FE',
      'Clothing': '#00C49F',
      'Food': '#FFBB28',
      'Books': '#FF8042',
      'Home': '#8884d8',
      'Beauty': '#D946EF',
      'Sports': '#22C55E',
      'Toys': '#F97316',
      'Health': '#0EA5E9',
      'Other': '#9F9EA1',
    };
    
    const categoryMap = new Map<string, number>();
    categoryData.data?.forEach(item => {
      const category = item.products.category;
      if (!category) return;
      
      const saleAmount = parseFloat(item.price_at_sale.toString()) * item.quantity;
      const existingAmount = categoryMap.get(category) || 0;
      categoryMap.set(category, existingAmount + saleAmount);
    });

    const categorySalesData = Array.from(categoryMap.entries())
      .map(([category, value]) => ({ 
        category, 
        value,
        color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#9F9EA1'
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const result = {
      salesByDate: Array.from(salesByDateMap.values()),
      topProducts: topProductsList,
      totalSales: totalSalesAmount,
      totalProducts: productsCount.count || 0,
      lowStockCount: lowStockProductsData.data?.length || 0,
      lowStockProducts: lowStockProductsData.data || [],
      categorySales: categorySalesData,
      monthlySalesTrend: monthlyTrendData,
      profitLossData: profitLossItems,
      financialMetrics,
      productProfitability: profitabilityData
    };

    console.log('Dashboard data successfully processed:', {
      totalSales: result.totalSales,
      totalProducts: result.totalProducts,
      lowStockCount: result.lowStockCount,
      salesByDateCount: result.salesByDate.length,
      topProductsCount: result.topProducts.length,
      profitLossDataCount: result.profitLossData.length
    });

    return result;

  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    // Don't show toast error on mobile to avoid UI issues
    if (typeof window !== 'undefined' && window.innerWidth > 768) {
      toast.error('Failed to load some dashboard data');
    }
    throw error;
  }
};

export const useDashboardData = (user: any) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboardData', user?.id],
    queryFn: () => fetchDashboardData(user.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (renamed from cacheTime)
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
    retry: (failureCount, error) => {
      console.log('Retry attempt:', failureCount, 'Error:', error);
      // Retry up to 2 times for network errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const defaultData: DashboardData = {
    salesByDate: [],
    topProducts: [],
    totalSales: 0,
    totalProducts: 0,
    lowStockCount: 0,
    lowStockProducts: [],
    categorySales: [],
    monthlySalesTrend: [],
    profitLossData: [],
    financialMetrics: {
      totalRevenue: 0,
      totalCost: 0,
      grossProfit: 0,
      profitMargin: 0
    },
    productProfitability: []
  };

  // Log error for debugging
  if (error) {
    console.error('Dashboard data query error:', error);
  }

  return { 
    data: data || defaultData, 
    isLoading, 
    error,
    refetch 
  };
};
