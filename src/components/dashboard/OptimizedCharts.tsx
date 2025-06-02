
import React, { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';
import { BarChart as BarChartIcon, TrendingUp, ChartLine, ChartPie } from 'lucide-react';
import { SaleSummary, ProductSale, CategorySale } from '@/hooks/useDashboardData';

interface OptimizedChartsProps {
  salesByDate: SaleSummary[];
  topProducts: ProductSale[];
  monthlySalesTrend: SaleSummary[];
  categorySales: CategorySale[];
  isLoading: boolean;
}

const LoadingSkeleton = memo(() => (
  <div className="h-[280px] w-full flex items-center justify-center">
    <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-full w-full rounded"></div>
  </div>
));

const SalesChart = memo(({ salesByDate, isLoading }: { salesByDate: SaleSummary[], isLoading: boolean }) => {
  const isMobile = useIsMobile();
  
  if (isLoading) return <LoadingSkeleton />;
  
  return (
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
            <ChartContainer config={{ sales: { color: "#2563eb" } }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis dataKey="date" tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
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
  );
});

const TopProductsChart = memo(({ topProducts, isLoading }: { topProducts: ProductSale[], isLoading: boolean }) => {
  const isMobile = useIsMobile();
  
  if (isLoading) return <LoadingSkeleton />;
  
  return (
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
            <ChartContainer config={{ revenue: { color: "#10b981" } }}>
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
                  <ChartTooltip content={<ChartTooltipContent />} />
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
  );
});

const MonthlyTrendChart = memo(({ monthlySalesTrend, isLoading }: { monthlySalesTrend: SaleSummary[], isLoading: boolean }) => {
  const isMobile = useIsMobile();
  
  if (isLoading) return <LoadingSkeleton />;
  
  return (
    <Card className="col-span-1 w-full shadow-sm hover:shadow-md transition-shadow border-purple-100">
      <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-1 sm:pb-2 bg-gradient-to-r from-purple-50 to-purple-100/50">
        <CardTitle className="text-lg sm:text-xl flex items-center">
          <ChartLine className="h-5 w-5 mr-2 text-purple-500" />
          Monthly Sales Trend
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">Last 6 months</CardDescription>
      </CardHeader>
      <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4 pb-3 sm:pb-6">
        <div className="h-[280px] w-full">
          <ChartContainer config={{ trend: { color: "#8b5cf6" } }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlySalesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="date" tick={{ fontSize: isMobile ? 10 : 12 }} />
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
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
      </CardContent>
    </Card>
  );
});

const CategoryChart = memo(({ categorySales, isLoading }: { categorySales: CategorySale[], isLoading: boolean }) => {
  const isMobile = useIsMobile();
  
  if (isLoading) return <LoadingSkeleton />;
  
  return (
    <Card className="col-span-1 w-full shadow-sm hover:shadow-md transition-shadow border-amber-100">
      <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-1 sm:pb-2 bg-gradient-to-r from-amber-50 to-amber-100/50">
        <CardTitle className="text-lg sm:text-xl flex items-center">
          <ChartPie className="h-5 w-5 mr-2 text-amber-500" />
          Sales by Category
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">Product category distribution</CardDescription>
      </CardHeader>
      <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4 pb-3 sm:pb-6">
        <div className="h-[280px] w-full">
          <ChartContainer config={{ category: { color: "#10b981" } }}>
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
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
});

const OptimizedCharts: React.FC<OptimizedChartsProps> = memo(({ 
  salesByDate, 
  topProducts, 
  monthlySalesTrend, 
  categorySales, 
  isLoading 
}) => {
  return (
    <>
      {/* Weekly Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <SalesChart salesByDate={salesByDate} isLoading={isLoading} />
        <TopProductsChart topProducts={topProducts} isLoading={isLoading} />
      </div>

      {/* Monthly Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6">
        <MonthlyTrendChart monthlySalesTrend={monthlySalesTrend} isLoading={isLoading} />
        <CategoryChart categorySales={categorySales} isLoading={isLoading} />
      </div>
    </>
  );
});

OptimizedCharts.displayName = 'OptimizedCharts';

export default OptimizedCharts;
