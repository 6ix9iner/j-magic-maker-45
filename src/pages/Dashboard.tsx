
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertCircle, ChartPie, ChartLine, Bot, Sparkles } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateAIInsights, generateChartRecommendations, SalesData } from '@/utils/geminiUtils';

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
  const [aiInsights, setAiInsights] = useState<string[]>([
    "Loading AI insights...",
  ]);
  const [chartRecommendation, setChartRecommendation] = useState<string>("");
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const navigate = useNavigate();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

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

        // Generate mock category sales data for pie chart
        const mockCategories = [
          { category: "Electronics", value: Math.floor(Math.random() * 1000) + 500 },
          { category: "Clothing", value: Math.floor(Math.random() * 1000) + 300 },
          { category: "Food", value: Math.floor(Math.random() * 1000) + 700 },
          { category: "Books", value: Math.floor(Math.random() * 1000) + 200 },
          { category: "Home", value: Math.floor(Math.random() * 1000) + 400 }
        ];
        setCategorySales(mockCategories);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-4 px-3 sm:py-6 sm:px-4 md:py-8 md:px-6">
      <div className="w-full max-w-7xl mx-auto">
        <header className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Overview of your inventory and sales
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          <Card className="col-span-1">
            <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
              <div className="text-lg sm:text-2xl font-bold">${totalSales.toFixed(2)}</div>
            </CardContent>
          </Card>
          
          <Card className="col-span-1">
            <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Products</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
              <div className="text-lg sm:text-2xl font-bold">{totalProducts}</div>
            </CardContent>
          </Card>
          
          <Card className="col-span-1">
            <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Recent Orders</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
              <div className="text-lg sm:text-2xl font-bold">{salesByDate.length}</div>
            </CardContent>
          </Card>
          
          <Popover>
            <PopoverTrigger asChild>
              <Card className="col-span-1 cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                    Low Stock Alert
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                  <div className="text-lg sm:text-2xl font-bold text-red-500">{lowStockCount}</div>
                </CardContent>
                <CardFooter className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4">
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Products with less than 5 items</span>
                </CardFooter>
              </Card>
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
                  {isLoading ? 'Loading products...' : 'No low stock products'}
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

        <Tabs defaultValue="weekly" className="w-full mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="weekly">Weekly Analysis</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Analysis</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              <Card className="col-span-1 w-full">
                <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-1 sm:pb-2">
                  <CardTitle className="text-lg sm:text-xl">Sales Last 7 Days</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Daily sales revenue</CardDescription>
                </CardHeader>
                <CardContent className="pt-1 sm:pt-2 px-1 sm:px-3 pb-3 sm:pb-6">
                  <div className="h-[300px] w-full">
                    {salesByDate.length > 0 ? (
                      <ChartContainer 
                        config={{
                          sales: { color: "#2563eb" },
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={salesByDate}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: isMobile ? 10 : 12 }} />
                            <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                            <Bar dataKey="total" name="Sales ($)" fill="#2563eb" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        {isLoading ? 'Loading data...' : 'No sales data available'}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-1 w-full">
                <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-1 sm:pb-2">
                  <CardTitle className="text-lg sm:text-xl">Top Products</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">By revenue</CardDescription>
                </CardHeader>
                <CardContent className="pt-1 sm:pt-2 px-1 sm:px-3 pb-3 sm:pb-6">
                  <div className="h-[300px] w-full">
                    {topProducts.length > 0 ? (
                      <ChartContainer 
                        config={{
                          revenue: { color: "#10b981" },
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topProducts} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tick={{ fontSize: isMobile ? 10 : 12 }} />
                            <YAxis 
                              dataKey="product_name" 
                              type="category" 
                              width={isMobile ? 80 : 150} 
                              tick={{ fontSize: isMobile ? 9 : 12 }}
                            />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                            <Bar dataKey="total_revenue" name="Revenue ($)" fill="#10b981" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        {isLoading ? 'Loading data...' : 'No product data available'}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              <Card className="col-span-1 w-full">
                <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-1 sm:pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Monthly Sales Trend</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Last 6 months</CardDescription>
                  </div>
                  <ChartLine className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pt-1 sm:pt-2 px-1 sm:px-3 pb-3 sm:pb-6">
                  <div className="h-[300px] w-full">
                    <ChartContainer 
                      config={{
                        trend: { color: "#8884d8" },
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlySalesTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: isMobile ? 10 : 12 }} />
                          <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                          <Tooltip content={<ChartTooltipContent />} />
                          <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                          <Line 
                            type="monotone" 
                            dataKey="total" 
                            name="Monthly Revenue ($)" 
                            stroke="#8884d8" 
                            strokeWidth={2} 
                            activeDot={{ r: 8 }} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-1 w-full">
                <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-1 sm:pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Sales by Category</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Product category distribution</CardDescription>
                  </div>
                  <ChartPie className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pt-1 sm:pt-2 px-1 sm:px-3 pb-3 sm:pb-6">
                  <div className="h-[300px] w-full">
                    <ChartContainer 
                      config={{
                        category: { color: "#10b981" },
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categorySales}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {categorySales.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights">
            <Card>
              <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                    AI Insights
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Powered by Google Gemini 2.0
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refreshAIInsights}
                  disabled={isLoadingAI}
                >
                  {isLoadingAI ? 'Analyzing...' : 'Refresh'}
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
                        <div className="bg-blue-100 rounded-full p-1">
                          <Bot className="h-5 w-5 text-blue-700" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-800">{insight}</p>
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
              <CardFooter className="px-4 sm:px-6 py-4 border-t">
                <p className="text-xs text-muted-foreground">
                  These insights are generated using Google's Gemini 2.0 AI based on your sales data.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
