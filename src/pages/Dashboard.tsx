import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

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

const Dashboard = () => {
  const [salesByDate, setSalesByDate] = useState<SaleSummary[]>([]);
  const [topProducts, setTopProducts] = useState<ProductSale[]>([]);
  const [totalSales, setTotalSales] = useState<number>(0);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Fetch total sales count and amount
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('total_amount');
        
        if (salesError) throw salesError;
        
        // Calculate total sales
        const totalSalesAmount = salesData.reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0);
        setTotalSales(totalSalesAmount);
        
        // Fetch sales by date for the chart (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: salesByDateData, error: salesByDateError } = await supabase
          .from('sales')
          .select('created_at, total_amount')
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
        
        // Fetch top selling products
        const { data: topProductsData, error: topProductsError } = await supabase
          .from('sale_items')
          .select(`
            name_at_sale,
            quantity,
            price_at_sale
          `)
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
        
        // Fetch products count
        const { count: productsCount, error: productsCountError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true });
        
        if (productsCountError) throw productsCountError;
        setTotalProducts(productsCount || 0);
        
        // Fetch low stock products (less than 5)
        const { count: lowStockProductsCount, error: lowStockError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .lt('stock_count', 5);
        
        if (lowStockError) throw lowStockError;
        setLowStockCount(lowStockProductsCount || 0);
        
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
          
          <Card className="col-span-1">
            <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Low Stock Alert</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
              <div className="text-lg sm:text-2xl font-bold text-red-500">{lowStockCount}</div>
            </CardContent>
            <CardFooter className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4">
              <span className="text-[10px] sm:text-xs text-muted-foreground">Products with less than 5 items</span>
            </CardFooter>
          </Card>
        </div>

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
                    <>
                      <BarChart data={salesByDate}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: isMobile ? 10 : 12 }} />
                        <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                        <Bar dataKey="total" name="Sales ($)" fill="#2563eb" />
                      </BarChart>
                    </>
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
                    <>
                      <BarChart data={topProducts} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: isMobile ? 10 : 12 }} />
                        <YAxis 
                          dataKey="product_name" 
                          type="category" 
                          width={isMobile ? 80 : 120} 
                          tick={{ fontSize: isMobile ? 9 : 12 }}
                        />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                        <Bar dataKey="total_revenue" name="Revenue ($)" fill="#10b981" />
                      </BarChart>
                    </>
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
      </div>
    </div>
  );
};

export default Dashboard;
