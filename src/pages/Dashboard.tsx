
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertCircle, ChartPie, ChartLine, Bot, Sparkles, TrendingUp, TrendingDown, DollarSign, Calendar, InfoIcon, BarChart as BarChartIcon, ArrowUpRight, LayoutGrid, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateAIInsights, generateChartRecommendations, SalesData } from '@/utils/geminiUtils';
import MetricCard from '@/components/dashboard/MetricCard';
import ProfitLossChart from '@/components/dashboard/ProfitLossChart';
import FinancialSummary from '@/components/dashboard/FinancialSummary';
import { calculateProfitMetrics, calculateActualCosts, calculateProductProfitability, formatCurrency, FinancialMetrics, ProductProfitability } from '@/utils/financialUtils';

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
  const [productProfitability, setProductProfitability] = useState<ProductProfitability[]>([]);
  const [aiInsights, setAiInsights] = useState<string[]>(["Loading AI insights..."]);
  const [chartRecommendation, setChartRecommendation] = useState<string>("");
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Category-specific colors
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
  
  const DEFAULT_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#D946EF', '#22C55E', '#F97316', '#0EA5E9', '#9F9EA1'];

  // Mobile-optimized data fetching with better error handling
  const fetchDashboardData = async () => {
    if (!user) {
      console.log('No user found, skipping dashboard data fetch');
      return;
    }
    
    console.log('Starting dashboard data fetch for user:', user.id);
    setIsLoading(true);
    setError(null);
    
    try {
      // Add timeout for mobile networks
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );

      // Fetch basic sales data first
      console.log('Fetching sales data...');
      const salesPromise = supabase
        .from('sales')
        .select('total_amount, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      
      const { data: salesData, error: salesError } = await Promise.race([salesPromise, timeoutPromise]) as any;
      
      if (salesError) {
        console.error('Sales data error:', salesError);
        throw new Error(`Failed to fetch sales data: ${salesError.message}`);
      }
      
      console.log('Sales data fetched:', salesData?.length || 0, 'records');
      
      // Calculate total sales
      const totalSalesAmount = salesData?.reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0) || 0;
      setTotalSales(totalSalesAmount);
      
      // Process sales by date (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentSales = salesData?.filter(sale => 
        new Date(sale.created_at) >= sevenDaysAgo
      ) || [];
      
      const salesByDateMap = new Map<string, SaleSummary>();
      recentSales.forEach(sale => {
        const date = new Date(sale.created_at).toLocaleDateString();
        const existingSummary = salesByDateMap.get(date) || { date, total: 0, count: 0 };
        
        salesByDateMap.set(date, {
          date,
          total: existingSummary.total + parseFloat(sale.total_amount.toString()),
          count: existingSummary.count + 1
        });
      });
      
      setSalesByDate(Array.from(salesByDateMap.values()));
      
      // Fetch products count
      console.log('Fetching products count...');
      const { count: productsCount, error: productsCountError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (productsCountError) {
        console.error('Products count error:', productsCountError);
      } else {
        setTotalProducts(productsCount || 0);
      }
      
      // Fetch low stock products
      console.log('Fetching low stock products...');
      const { data: lowStockProductsData, error: lowStockError } = await supabase
        .from('products')
        .select('id, name, stock_count, barcode')
        .eq('user_id', user.id)
        .lt('stock_count', 5)
        .order('stock_count', { ascending: true })
        .limit(10);
      
      if (lowStockError) {
        console.error('Low stock error:', lowStockError);
      } else {
        setLowStockProducts(lowStockProductsData || []);
        setLowStockCount(lowStockProductsData?.length || 0);
      }

      // Fetch top products with simplified query for mobile
      console.log('Fetching top products...');
      const { data: topProductsData, error: topProductsError } = await supabase
        .from('sale_items')
        .select(`
          name_at_sale,
          quantity,
          price_at_sale,
          sales!inner(user_id)
        `)
        .eq('sales.user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (topProductsError) {
        console.error('Top products error:', topProductsError);
      } else {
        // Process top products
        const productMap = new Map<string, ProductSale>();
        
        topProductsData?.forEach(item => {
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
      }

      // Set default financial metrics for mobile performance
      setFinancialMetrics({
        totalRevenue: totalSalesAmount,
        totalCost: totalSalesAmount * 0.3, // Estimate 30% cost
        grossProfit: totalSalesAmount * 0.7,
        profitMargin: 70
      });

      // Set simplified monthly data for mobile
      const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      setMonthlySalesTrend([{
        date: currentMonth,
        total: totalSalesAmount,
        count: recentSales.length
      }]);

      // Set default profit/loss data
      setProfitLossData([{
        date: currentMonth,
        revenue: totalSalesAmount,
        cost: totalSalesAmount * 0.3,
        profit: totalSalesAmount * 0.7
      }]);

      // Set default category sales for mobile
      setCategorySales([
        { category: "General", value: totalSalesAmount, color: CATEGORY_COLORS['Other'] }
      ]);

      console.log('Dashboard data fetch completed successfully');
      
    } catch (error: any) {
      console.error('Dashboard data fetch error:', error);
      setError(error.message || 'Failed to load dashboard data');
      toast.error(`Failed to load dashboard: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('Dashboard useEffect triggered, authLoading:', authLoading, 'user:', !!user);
    
    if (authLoading) {
      console.log('Auth still loading, waiting...');
      return;
    }
    
    if (!user) {
      console.log('No user found, redirecting to auth');
      navigate('/auth');
      return;
    }

    // Small delay to ensure everything is ready
    const timer = setTimeout(() => {
      fetchDashboardData();
    }, 100);

    return () => clearTimeout(timer);
  }, [user, authLoading, navigate]);

  const navigateToInventory = () => {
    navigate('/inventory');
  };

  const navigateToSales = () => {
    navigate('/sales');
  };

  const refreshAIInsights = async () => {
    if (!user || isLoading) return;
    
    setIsLoadingAI(true);
    try {
      const salesDataForAI: SalesData = {
        totalSales,
        totalProducts,
        recentOrders: salesByDate.reduce((sum, day) => sum + day.count, 0),
        lowStockCount,
        salesByDate,
        topProducts,
        totalCosts: financialMetrics.totalCost,
        grossProfit: financialMetrics.grossProfit,
        profitMargin: financialMetrics.profitMargin,
        profitLossData,
        productProfitability
      };
      
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

  // Show loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Dashboard Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">{error}</p>
            <Button onClick={() => {
              setError(null);
              fetchDashboardData();
            }} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get current day and month for the welcome message
  const today = new Date();
  const currentDay = today.toLocaleDateString('en-US', { weekday: 'long' });
  const currentMonth = today.toLocaleDateString('en-US', { month: 'long' });
  const currentDate = today.getDate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-4 px-3 sm:py-6 sm:px-4 md:py-8 md:px-6">
      <div className="w-full max-w-7xl mx-auto">
        <header className="mb-4 sm:mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Dashboard
              <span className="block sm:hidden text-sm font-normal text-gray-500 mt-1">{currentDay}, {currentMonth} {currentDate}</span>
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 hidden sm:block">
              {currentDay}, {currentMonth} {currentDate}
            </p>
          </div>
          
          <div className="flex items-center gap-2 mt-2 sm:mt-0 self-end">
            <Button variant="outline" size="sm" onClick={refreshAIInsights} disabled={isLoadingAI}>
              <Sparkles className="h-4 w-4 mr-1" />
              {isLoadingAI ? 'Analyzing...' : 'Get AI Insights'}
            </Button>
            
            <Button variant="outline" size="sm" onClick={navigateToInventory}>
              <LayoutGrid className="h-4 w-4 mr-1" />
              Inventory
            </Button>
          </div>
        </header>

        {/* Strategic KPI Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          <MetricCard 
            title="Total Sales"
            value={formatCurrency(totalSales)}
            icon={DollarSign}
            iconColor="text-green-500"
            highPriority={true}
          />
          
          <MetricCard 
            title="Gross Profit"
            value={formatCurrency(financialMetrics.grossProfit)}
            icon={TrendingUp}
            iconColor={financialMetrics.grossProfit >= 0 ? "text-green-500" : "text-red-500"}
            valueClassName={financialMetrics.grossProfit >= 0 ? "text-green-600" : "text-red-600"}
            highPriority={true}
          />
          
          <MetricCard 
            title="Profit Margin"
            value={`${financialMetrics.profitMargin.toFixed(1)}%`}
            icon={financialMetrics.profitMargin >= 0 ? TrendingUp : TrendingDown}
            iconColor={financialMetrics.profitMargin >= 0 ? "text-green-500" : "text-red-500"}
            valueClassName={financialMetrics.profitMargin >= 0 ? "text-green-600" : "text-red-600"}
          />
          
          <Popover>
            <PopoverTrigger asChild>
              <div className="contents">
                <MetricCard 
                  title="Low Stock Alert"
                  value={lowStockCount}
                  icon={AlertCircle}
                  iconColor="text-red-500"
                  valueClassName="text-red-500"
                  description={lowStockCount > 0 ? "Action needed" : "All items stocked"}
                  onClick={() => {}} 
                />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 max-h-96 overflow-auto p-0" align="end">
              <div className="p-4 border-b">
                <h3 className="font-medium text-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Low Stock Products
                </h3>
                <p className="text-sm text-muted-foreground">Products with less than 5 items in stock</p>
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
                          <TableCell className="text-right font-medium text-red-500">{product.stock_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  No low stock products
                </div>
              )}
              <div className="p-3 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={navigateToInventory}
                >
                  Go to Inventory
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Additional KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
          <MetricCard 
            title="Total Products"
            value={totalProducts}
            icon={LayoutGrid}
            description="Active inventory items"
          />
          
          <MetricCard 
            title="Recent Orders"
            value={salesByDate.reduce((sum, day) => sum + day.count, 0)}
            icon={Calendar}
            description="Last 7 days"
          />
          
          <MetricCard 
            title="Avg. Order Value"
            value={formatCurrency(
              salesByDate.length > 0 
                ? totalSales / Math.max(salesByDate.reduce((sum, day) => sum + day.count, 0), 1)
                : 0
            )}
            icon={DollarSign}
            description="Last 7 days"
          />
        </div>

        <Tabs defaultValue="financial" className="w-full mb-6">
          <TabsList className="mb-4 overflow-auto flex flex-nowrap bg-white/50 backdrop-blur-sm p-1">
            <TabsTrigger value="financial">Financial Analysis</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
              <div className="col-span-1 lg:col-span-2">
                <ProfitLossChart data={profitLossData} title="Revenue vs. Cost" description="Monthly breakdown" />
              </div>
              <div className="col-span-1">
                <FinancialSummary metrics={financialMetrics} />
              </div>
            </div>

            {/* Charts Section - Simplified for mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card className="col-span-1 w-full shadow-sm hover:shadow-md transition-shadow border-blue-100">
                <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-1 sm:pb-2 bg-gradient-to-r from-blue-50 to-blue-100/50">
                  <CardTitle className="text-lg sm:text-xl flex items-center">
                    <BarChartIcon className="h-5 w-5 mr-2 text-blue-500" />
                    Sales Last 7 Days
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Daily sales revenue</CardDescription>
                </CardHeader>
                <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4 pb-3 sm:pb-6">
                  <div className="h-[280px] w-full">
                    {salesByDate.length > 0 ? (
                      <ChartContainer 
                        config={{
                          sales: { color: "#2563eb" },
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={salesByDate}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                            <XAxis dataKey="date" tick={{ fontSize: isMobile ? 10 : 12 }} />
                            <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                            <Bar dataKey="total" name="Sales ($)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No sales data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-1 w-full shadow-sm hover:shadow-md transition-shadow border-green-100">
                <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-1 sm:pb-2 bg-gradient-to-r from-green-50 to-green-100/50">
                  <CardTitle className="text-lg sm:text-xl flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                    Top Products
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">By revenue this week</CardDescription>
                </CardHeader>
                <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4 pb-3 sm:pb-6">
                  <div className="h-[280px] w-full">
                    {topProducts.length > 0 ? (
                      <ChartContainer 
                        config={{
                          revenue: { color: "#10b981" },
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topProducts} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                            <XAxis type="number" tick={{ fontSize: isMobile ? 10 : 12 }} />
                            <YAxis 
                              dataKey="product_name" 
                              type="category" 
                              width={isMobile ? 80 : 150} 
                              tick={{ fontSize: isMobile ? 9 : 12 }}
                            />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                            <Bar dataKey="total_revenue" name="Revenue ($)" fill="#10b981" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No product data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights">
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 flex flex-row items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-100">
                <div>
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    AI Insights
                  </CardTitle>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refreshAIInsights}
                  disabled={isLoadingAI}
                  className="bg-white hover:bg-blue-50"
                >
                  {isLoadingAI ? 'Analyzing...' : 'Refresh Insights'}
                </Button>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 py-4">
                <div className="space-y-4">
                  {isLoadingAI ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="animate-spin h-8 w-8 mb-4 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                      <p className="text-muted-foreground">Analyzing your business data...</p>
                    </div>
                  ) : (
                    aiInsights.map((insight, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                        <div className="bg-blue-100 rounded-full p-1 flex-shrink-0">
                          <Bot className="h-5 w-5 text-blue-700" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-800">{insight}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
