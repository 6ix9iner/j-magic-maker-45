import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertCircle, ChartPie, ChartLine, Bot, Sparkles, TrendingUp, TrendingDown, DollarSign, Calendar, InfoIcon, BarChart as BarChartIcon, ArrowUpRight, LayoutGrid } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateAIInsights, generateChartRecommendations, SalesData } from '@/utils/geminiUtils';
import MetricCard from '@/components/dashboard/MetricCard';
import ProfitLossChart from '@/components/dashboard/ProfitLossChart';
import FinancialSummary from '@/components/dashboard/FinancialSummary';
import { calculateProfitMetrics, estimateCosts, formatCurrency, FinancialMetrics } from '@/utils/financialUtils';

interface SaleSummary {
  date: string;
  total: number;
  count: number;
}

interface ProductSale {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock_count: number;
  barcode: string;
}

interface CategorySale {
  category: string;
  value: number;
  color?: string;
}

interface ProfitLossData {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
}

const Dashboard = () => {
  const [salesByDate, setSalesByDate] = useState<SaleSummary[]>([]);
  const [topProducts, setTopProducts] = useState<ProductSale[]>([]);
  const [totalSales, setTotalSales] = useState<number>(0);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySale[]>([]);
  const [monthlySalesTrend, setMonthlySalesTrend] = useState<SaleSummary[]>([]);
  const [profitLossData, setProfitLossData] = useState<ProfitLossData[]>([]);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics>({
    totalRevenue: 0,
    totalCost: 0,
    grossProfit: 0,
    profitMargin: 0
  });
  const [aiInsights, setAiInsights] = useState<string[]>(["Loading AI insights..."]);
  const [chartRecommendation, setChartRecommendation] = useState<string>("");
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Category-specific colors
  const CATEGORY_COLORS = {
    'Electronics': '#06b6d4',   // Cyan-500
    'Clothing': '#14b8a6',      // Teal-500
    'Food': '#f97316',          // Orange-500
    'Books': '#8b5cf6',         // Violet-500
    'Home': '#6366f1',          // Indigo-500
    'Beauty': '#d946ef',        // Fuchsia-500
    'Sports': '#22c55e',        // Green-500
    'Toys': '#f59e0b',          // Amber-500
    'Health': '#0ea5e9',        // Sky-500
    'Other': '#64748b',         // Slate-500
  };
  
  // Default colors for categories not in the map
  const DEFAULT_COLORS = ['#06b6d4', '#14b8a6', '#f97316', '#8b5cf6', '#6366f1', '#d946ef', '#22c55e', '#f59e0b', '#0ea5e9', '#64748b'];

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Fetch total sales count and amount with user_id filter
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('total_amount')
          .eq('user_id', user.id);
        
        if (salesError) throw salesError;
        
        // Calculate total sales
        const totalSalesAmount = salesData.reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0);
        setTotalSales(totalSalesAmount);
        
        // Fetch sales by date for the chart (last 7 days) with user_id filter
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: salesByDateData, error: salesByDateError } = await supabase
          .from('sales')
          .select('created_at, total_amount')
          .eq('user_id', user.id)
          .gte('created_at', sevenDaysAgo.toISOString());
        
        if (salesByDateError) throw salesByDateError;
        
        // Process sales by date
        const salesByDateMap = new Map<string, SaleSummary>();
        
        salesByDateData.forEach(sale => {
          const date = new Date(sale.created_at).toLocaleDateString();
          const existingSummary = salesByDateMap.get(date) || { date, total: 0, count: 0 };
          
          salesByDateMap.set(date, {
            date,
            total: existingSummary.total + parseFloat(sale.total_amount.toString()),
            count: existingSummary.count + 1
          });
        });
        
        setSalesByDate(Array.from(salesByDateMap.values()));
        
        // Fetch top selling products with user_id filter (through sales)
        const { data: topProductsData, error: topProductsError } = await supabase
          .from('sale_items')
          .select(`
            name_at_sale,
            quantity,
            price_at_sale,
            sale_id,
            sales!inner(user_id)
          `)
          .eq('sales.user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (topProductsError) throw topProductsError;
        
        // Process top products
        const productMap = new Map<string, ProductSale>();
        
        topProductsData.forEach(item => {
          const productName = item.name_at_sale;
          const existingProduct = productMap.get(productName) || { 
            product_name: productName, 
            total_quantity: 0, 
            total_revenue: 0 
          };
          
          productMap.set(productName, {
            product_name: productName,
            total_quantity: existingProduct.total_quantity + item.quantity,
            total_revenue: existingProduct.total_revenue + (parseFloat(item.price_at_sale.toString()) * item.quantity)
          });
        });
        
        const topProductsList = Array.from(productMap.values())
          .sort((a, b) => b.total_revenue - a.total_revenue)
          .slice(0, 5);
          
        setTopProducts(topProductsList);
        
        // Fetch products count with user_id filter
        const { count: productsCount, error: productsCountError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        if (productsCountError) throw productsCountError;
        setTotalProducts(productsCount || 0);
        
        // Fetch low stock products with user_id filter
        const { data: lowStockProductsData, error: lowStockError } = await supabase
          .from('products')
          .select('id, name, stock_count, barcode')
          .eq('user_id', user.id)
          .lt('stock_count', 5)
          .order('stock_count', { ascending: true });
        
        if (lowStockError) throw lowStockError;
        
        setLowStockProducts(lowStockProductsData || []);
        setLowStockCount(lowStockProductsData?.length || 0);

        // Fetch category sales data from the database
        const { data: categoryData, error: categoryError } = await supabase
          .from('sale_items')
          .select(`
            name_at_sale,
            price_at_sale,
            quantity,
            sales!inner(user_id, created_at),
            products!inner(category)
          `)
          .eq('sales.user_id', user.id)
          .not('products.category', 'is', null);
        
        if (categoryError) throw categoryError;
        
        // Process category sales data
        const categoryMap = new Map<string, number>();
        
        categoryData.forEach(item => {
          const category = item.products.category;
          if (!category) return; // Skip items without a category
          
          const saleAmount = parseFloat(item.price_at_sale.toString()) * item.quantity;
          const existingAmount = categoryMap.get(category) || 0;
          categoryMap.set(category, existingAmount + saleAmount);
        });
        
        // If we don't have category data, try to get it from sale_items
        if (categoryMap.size === 0) {
          // Alternative approach: use sale items directly
          const { data: saleItemsData, error: saleItemsError } = await supabase
            .from('sale_items')
            .select(`
              name_at_sale,
              price_at_sale,
              quantity,
              sale_id,
              sales!inner(user_id)
            `)
            .eq('sales.user_id', user.id);
          
          if (saleItemsError) throw saleItemsError;
          
          // Try to extract categories from product names if available
          const extractedCategories = new Map<string, number>();
          
          saleItemsData.forEach(item => {
            // Simple category extraction based on product name
            // This is a fallback method if proper categories aren't available
            let category = "Other";
            const name = item.name_at_sale?.toLowerCase() || "";
            
            // Basic category detection rules
            if (name.includes("phone") || name.includes("laptop") || name.includes("computer") || name.includes("tablet")) {
              category = "Electronics";
            } else if (name.includes("shirt") || name.includes("pants") || name.includes("dress") || name.includes("jacket")) {
              category = "Clothing";
            } else if (name.includes("book") || name.includes("novel") || name.includes("textbook")) {
              category = "Books";
            } else if (name.includes("food") || name.includes("drink") || name.includes("snack")) {
              category = "Food";
            } else if (name.includes("furniture") || name.includes("chair") || name.includes("table") || name.includes("bed")) {
              category = "Home";
            }
            
            const saleAmount = parseFloat(item.price_at_sale.toString()) * item.quantity;
            const existingAmount = extractedCategories.get(category) || 0;
            extractedCategories.set(category, existingAmount + saleAmount);
          });
          
          // Use extracted categories if we found any
          if (extractedCategories.size > 0) {
            categoryMap.clear();
            extractedCategories.forEach((value, key) => {
              categoryMap.set(key, value);
            });
          }
        }
        
        // Convert to array format for the chart with assigned colors
        const categorySalesData = Array.from(categoryMap.entries())
          .map(([category, value]) => ({ 
            category, 
            value,
            // Assign color based on category name or use default color if not found
            color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5); // Take top 5 categories
        
        // If we still have no category data, use default mock data with assigned colors
        if (categorySalesData.length === 0) {
          const mockCategories = [
            { category: "Electronics", value: Math.floor(Math.random() * 1000) + 500, color: CATEGORY_COLORS['Electronics'] },
            { category: "Clothing", value: Math.floor(Math.random() * 1000) + 300, color: CATEGORY_COLORS['Clothing'] },
            { category: "Food", value: Math.floor(Math.random() * 1000) + 700, color: CATEGORY_COLORS['Food'] },
            { category: "Books", value: Math.floor(Math.random() * 1000) + 200, color: CATEGORY_COLORS['Books'] },
            { category: "Home", value: Math.floor(Math.random() * 1000) + 400, color: CATEGORY_COLORS['Home'] }
          ];
          setCategorySales(mockCategories);
        } else {
          setCategorySales(categorySalesData);
        }

        // Fetch monthly sales data for the trend chart (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const { data: monthlySalesData, error: monthlySalesError } = await supabase
          .from('sales')
          .select('created_at, total_amount')
          .eq('user_id', user.id)
          .gte('created_at', sixMonthsAgo.toISOString());
        
        if (monthlySalesError) throw monthlySalesError;
        
        // Process monthly sales data
        const monthlySalesMap = new Map<string, SaleSummary>();
        
        monthlySalesData.forEach(sale => {
          const saleDate = new Date(sale.created_at);
          const monthKey = saleDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          const existingSummary = monthlySalesMap.get(monthKey) || { 
            date: monthKey, 
            total: 0, 
            count: 0 
          };
          
          monthlySalesMap.set(monthKey, {
            date: monthKey,
            total: existingSummary.total + parseFloat(sale.total_amount.toString()),
            count: existingSummary.count + 1
          });
        });
        
        // Convert to array and sort chronologically
        let monthlyTrendData = Array.from(monthlySalesMap.values());
        
        // If we have less than 6 months of data, fill in the missing months with zeros
        const currentDate = new Date();
        for (let i = 0; i < 6; i++) {
          const monthDate = new Date(currentDate);
          monthDate.setMonth(currentDate.getMonth() - i);
          const monthKey = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          
          if (!monthlySalesMap.has(monthKey)) {
            monthlyTrendData.push({
              date: monthKey,
              total: 0,
              count: 0
            });
          }
        }
        
        // Sort by date (need to convert month abbreviation to date for proper sorting)
        monthlyTrendData.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });
        
        // Take only the last 6 months
        monthlyTrendData = monthlyTrendData.slice(-6);
        
        setMonthlySalesTrend(monthlyTrendData);
        
        // Calculate profit/loss data
        const profitLossItems: ProfitLossData[] = monthlyTrendData.map(item => {
          const revenue = item.total;
          const cost = estimateCosts(revenue);
          return {
            date: item.date,
            revenue,
            cost,
            profit: revenue - cost
          };
        });
        
        setProfitLossData(profitLossItems);
        
        // Calculate overall financial metrics
        const currentMonthRevenue = profitLossItems.length > 0 ? profitLossItems[profitLossItems.length - 1].revenue : 0;
        const previousMonthRevenue = profitLossItems.length > 1 ? profitLossItems[profitLossItems.length - 2].revenue : undefined;
        const totalCost = estimateCosts(totalSalesAmount);
        
        setFinancialMetrics(calculateProfitMetrics(totalSalesAmount, totalCost, previousMonthRevenue));
        
        // Use the collected data to generate AI insights
        setIsLoadingAI(true);
        const salesDataForAI: SalesData = {
          totalSales: totalSalesAmount,
          totalProducts: productsCount || 0,
          recentOrders: salesByDateData.length,
          lowStockCount: lowStockProductsData?.length || 0,
          salesByDate: Array.from(salesByDateMap.values()),
          topProducts: topProductsList
        };

        // Generate insights in parallel
        const [insights, recommendation] = await Promise.all([
          generateAIInsights(salesDataForAI),
          generateChartRecommendations(salesDataForAI)
        ]);
        
        setAiInsights(insights);
        setChartRecommendation(recommendation);
        
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
        setIsLoadingAI(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const navigateToInventory = () => {
    navigate('/inventory');
  };

  const navigateToSales = () => {
    navigate('/sales');
  };

  const refreshAIInsights = async () => {
    if (!user) return;
    
    setIsLoadingAI(true);
    try {
      // Prepare data for AI analysis
      const salesDataForAI: SalesData = {
        totalSales,
        totalProducts,
        recentOrders: salesByDate.reduce((sum, day) => sum + day.count, 0),
        lowStockCount,
        salesByDate,
        topProducts
      };
      
      // Generate fresh AI insights
      const insights = await generateAIInsights(salesDataForAI);
      setAiInsights(insights);
      toast.success("AI insights refreshed");
    } catch (error) {
      console.error("Failed to refresh AI insights:", error);
      toast.error("Failed to refresh insights");
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Get current day and month for the welcome message
  const today = new Date();
  const currentDay = today.toLocaleDateString('en-US', { weekday: 'long' });
  const currentMonth = today.toLocaleDateString('en-US', { month: 'long' });
  const currentDate = today.getDate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-6 px-4 sm:py-8 sm:px-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center">
              Dashboard
              <span className="ml-3 text-sm font-normal text-slate-500 hidden sm:inline-block">{currentDay}, {currentMonth} {currentDate}</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500 sm:hidden">
              {currentDay}, {currentMonth} {currentDate}
            </p>
          </div>
          
          <div className="flex items-center gap-2 mt-3 sm:mt-0 self-end sm:self-auto">
            <Button variant="outline" size="sm" className="bg-white hover:bg-slate-50" onClick={refreshAIInsights} disabled={isLoadingAI}>
              <Sparkles className="h-4 w-4 mr-1.5 text-amber-500" />
              {isLoadingAI ? 'Analyzing...' : 'AI Insights'}
            </Button>
            
            <Button variant="outline" size="sm" className="bg-white hover:bg-slate-50" onClick={navigateToInventory}>
              <LayoutGrid className="h-4 w-4 mr-1.5 text-emerald-500" />
              Inventory
            </Button>
          </div>
        </header>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard 
            title="Total Sales"
            value={formatCurrency(totalSales)}
            icon={DollarSign}
            iconColor="text-emerald-500"
            highPriority={true}
            className="bg-white"
          />
          
          <MetricCard 
            title="Profit"
            value={formatCurrency(financialMetrics.grossProfit)}
            icon={TrendingUp}
            iconColor={financialMetrics.grossProfit >= 0 ? "text-emerald-500" : "text-rose-500"}
            valueClassName={financialMetrics.grossProfit >= 0 ? "text-emerald-600" : "text-rose-600"}
            trend={
              financialMetrics.revenueGrowth !== undefined ? {
                value: Math.round(financialMetrics.revenueGrowth * 10) / 10,
                isPositive: financialMetrics.revenueGrowth >= 0
              } : undefined
            }
            highPriority={true}
            className="bg-white"
          />
          
          <MetricCard 
            title="Profit Margin"
            value={`${financialMetrics.profitMargin.toFixed(1)}%`}
            icon={financialMetrics.profitMargin >= 0 ? TrendingUp : TrendingDown}
            iconColor={financialMetrics.profitMargin >= 0 ? "text-emerald-500" : "text-rose-500"}
            valueClassName={financialMetrics.profitMargin >= 0 ? "text-emerald-600" : "text-rose-600"}
            className="bg-white"
          />
          
          <Popover>
            <PopoverTrigger asChild>
              <div className="contents">
                <MetricCard 
                  title="Low Stock Alert"
                  value={lowStockCount}
                  icon={AlertCircle}
                  iconColor="text-rose-500"
                  valueClassName={lowStockCount > 0 ? "text-rose-600" : "text-slate-600"}
                  description={lowStockCount > 0 ? "Items need attention" : "All items stocked"}
                  onClick={() => {}} 
                  className="bg-white border-l-[3px] border-l-rose-500"
                />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 max-h-96 overflow-auto p-0 shadow-lg" align="end">
              <div className="p-4 border-b bg-slate-50">
                <h3 className="font-medium text-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                  Low Stock Products
                </h3>
                <p className="text-sm text-slate-500">Products with less than 5 items in stock</p>
              </div>
              {lowStockProducts.length > 0 ? (
                <div className="max-h-[300px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockProducts.map(product => (
                        <TableRow key={product.id}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell className="text-right font-medium text-rose-500">{product.stock_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-4 text-center text-slate-400">
                  {isLoading ? 'Loading products...' : 'No low stock products'}
                </div>
              )}
              <div className="p-3 border-t bg-slate-50">
                <Button 
                  variant="outline" 
                  className="w-full bg-white hover:bg-slate-50"
                  onClick={navigateToInventory}
                >
                  Manage Inventory
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* AI Insights Card */}
        {aiInsights.length > 0 && !isLoadingAI && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-indigo-700">
                <Sparkles className="h-4 w-4 text-amber-500" />
                AI Business Insight
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-indigo-800 font-medium">
                {aiInsights[0]}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="sm" className="ml-auto text-xs text-indigo-600 hover:text-indigo-800 hover:bg-blue-100" onClick={() => {
                document.getElementById('insights-tab')?.click();
              }}>
                View all insights
                <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Main Dashboard Content */}
        <div className="space-y-6">
          {/* Combined Performance View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Overview Charts */}
            <Card className="col-span-1 lg:col-span-2 shadow-sm hover:shadow-md transition-all duration-200 bg-white overflow-hidden">
              <CardHeader className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                <Tabs defaultValue="weekly" className="w-full">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg text-slate-800">Sales Performance</CardTitle>
                    <TabsList className="bg-slate-200/70">
                      <TabsTrigger value="weekly" className="text-xs px-3">Weekly</TabsTrigger>
                      <TabsTrigger value="monthly" className="text-xs px-3">Monthly</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="weekly" className="mt-2 mb-0">
                    <CardDescription className="text-sm text-slate-500">Last 7 days sales activity</CardDescription>
                  </TabsContent>
                  
                  <TabsContent value="monthly" className="mt-2 mb-0">
                    <CardDescription className="text-sm text-slate-500">6-month revenue trend</CardDescription>
                  </TabsContent>
                </Tabs>
              </CardHeader>
              
              <CardContent className="pt-4 px-3 pb-4">
                <Tabs defaultValue="weekly" className="w-full">
                  <TabsContent value="weekly" className="mt-0">
                    <div className="h-[250px] w-full">
                      {salesByDate.length > 0 ? (
                        <ChartContainer config={{ sales: { color: "#3b82f6" } }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salesByDate}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="date" tick={{ fontSize: isMobile ? 10 : 12, fill: "#64748b" }} />
                              <YAxis tick={{ fontSize: isMobile ? 10 : 12, fill: "#64748b" }} />
                              <Tooltip content={<ChartTooltipContent />} />
                              <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                              <Bar dataKey="total" name="Sales ($)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-400">
                          {isLoading ? 'Loading data...' : 'No sales data available'}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="monthly" className="mt-0">
                    <div className="h-[250px] w-full">
                      <ChartContainer config={{ trend: { color: "#8b5cf6" } }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={monthlySalesTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: isMobile ? 10 : 12, fill: "#64748b" }} />
                            <YAxis tick={{ fontSize: isMobile ? 10 : 12, fill: "#64748b" }} />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                            <Line 
                              type="monotone" 
                              dataKey="total" 
                              name="Monthly Revenue ($)" 
                              stroke="#8b5cf6" 
                              strokeWidth={2} 
                              activeDot={{ r: 8 }} 
                              dot={{ r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            
            {/* Financial Summary */}
            <Card className="col-span-1 bg-white">
              <FinancialSummary metrics={financialMetrics} compact={isMobile} />
            </Card>
          </div>
          
          {/* Secondary Analysis Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Categories Distribution */}
            <Card className="bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
              <CardHeader className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg text-slate-800">Sales by Category</CardTitle>
                    <CardDescription className="text-sm text-slate-500">Product category breakdown</CardDescription>
                  </div>
                  <ChartPie className="h-5 w-5 text-violet-500" />
                </div>
              </CardHeader>
              <CardContent className="pt-4 px-3 pb-4">
                <div className="h-[250px] w-full">
                  <ChartContainer config={{ category: { color: "#8b5cf6" } }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categorySales}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={isMobile ? 70 : 80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="category"
                        >
                          {categorySales.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Top Products */}
            <Card className="bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
              <CardHeader className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg text-slate-800">Top Products</CardTitle>
                    <CardDescription className="text-sm text-slate-500">Best selling items by revenue</CardDescription>
                  </div>
                  <BarChartIcon className="h-5 w-5 text-emerald-500" />
                </div>
              </CardHeader>
              <CardContent className="pt-4 px-3 pb-4">
                <div className="h-[250px] w-full">
                  {topProducts.length > 0 ? (
                    <ChartContainer config={{ revenue: { color: "#10b981" } }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topProducts} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis type="number" tick={{ fontSize: isMobile ? 10 : 12, fill: "#64748b" }} />
                          <YAxis 
                            dataKey="product_name" 
                            type="category" 
                            width={isMobile ? 80 : 150} 
                            tick={{ fontSize: isMobile ? 9 : 12, fill: "#64748b" }}
                          />
                          <Tooltip content={<ChartTooltipContent />} />
                          <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                          <Bar dataKey="total_revenue" name="Revenue ($)" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                      {isLoading ? 'Loading data...' : 'No product data available'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Profit/Loss Analysis */}
          <Card className="bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
            <CardHeader className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg text-slate-800">Revenue vs. Cost Analysis</CardTitle>
                  <CardDescription className="text-sm text-slate-500">Monthly profit/loss breakdown</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 px-3 pb-4">
              <div className="h-[300px] w-full">
                <ProfitLossChart data={profitLossData} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights Section */}
        <Card className="bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
          <CardHeader className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b" id="insights-tab">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  AI Business Insights
                </CardTitle>
                <CardDescription className="text-sm text-slate-500">Powered by Google Gemini AI</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white hover:bg-slate-50"
                onClick={refreshAIInsights}
                disabled={isLoadingAI}
              >
                {isLoadingAI ? 'Analyzing...' : 'Refresh'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 py-4">
            <div className="space-y-4">
              {isLoadingAI ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin h-8 w-8 mb-4 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                  <p className="text-slate-500">Analyzing your business data...</p>
                </div>
              ) : (
                aiInsights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="bg-blue-100 rounded-full p-1.5 flex-shrink-0">
                      <Bot className="h-4 w-4 text-blue-700" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-800">{insight}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {chartRecommendation && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <h3 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                  <ChartLine className="h-4 w-4" />
                  Chart Recommendation
                </h3>
                <p className="text-sm text-amber-700">{chartRecommendation}</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="px-4 py-3 border-t bg-slate-50">
            <p className="text-xs text-slate-500">
              These insights are generated using Google's Gemini AI based on your sales data.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
