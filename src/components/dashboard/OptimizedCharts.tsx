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
  <div className="h-[260px] w-full flex items-center justify-center">
    <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-full w-full rounded"></div>
  </div>
));

const SalesChart = memo(({ salesByDate, isLoading }: { salesByDate: SaleSummary[], isLoading: boolean }) => {
  const isMobile = useIsMobile();
  
  if (isLoading) return <LoadingSkeleton />;
  
  return (
    <Card className="col-span-1 w-full border border-slate-100 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden">
      <CardHeader className="px-4 pt-5 pb-3 border-b border-slate-50 dark:border-slate-800">
        <CardTitle className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center">
          <BarChartIcon className="h-5 w-5 mr-2 text-indigo-500" />
          Sales Last 7 Days
        </CardTitle>
        <CardDescription className="text-xs text-slate-400 dark:text-slate-500 font-medium">Daily sales revenue</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 px-4 pb-4">
        <div className="h-[260px] w-full">
          {salesByDate.length > 0 ? (
            <ChartContainer config={{ sales: { color: "#6366f1" } }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByDate}>
                  <defs>
                    <linearGradient id="sales-bar-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.95}/>
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: isMobile ? 9 : 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis 
                    tick={{ fontSize: isMobile ? 9 : 11, fill: '#94a3b8' }} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `₦${val >= 1000 ? (val / 1000).toFixed(0) + 'K' : val}`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" name="Sales (₦)" fill="url(#sales-bar-grad)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
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
    <Card className="col-span-1 w-full border border-slate-100 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden">
      <CardHeader className="px-4 pt-5 pb-3 border-b border-slate-50 dark:border-slate-800">
        <CardTitle className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-emerald-500" />
          Top Products
        </CardTitle>
        <CardDescription className="text-xs text-slate-400 dark:text-slate-500 font-medium">By revenue this week</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 px-4 pb-4">
        <div className="h-[260px] w-full">
          {topProducts.length > 0 ? (
            <ChartContainer config={{ revenue: { color: "#10b981" } }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <defs>
                    <linearGradient id="prod-bar-grad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.95}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: isMobile ? 9 : 11, fill: '#94a3b8' }} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `₦${val >= 1000 ? (val / 1000).toFixed(0) + 'K' : val}`}
                  />
                  <YAxis 
                    dataKey="product_name" 
                    type="category" 
                    width={isMobile ? 80 : 120} 
                    tick={{ fontSize: isMobile ? 8 : 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total_revenue" name="Revenue (₦)" fill="url(#prod-bar-grad)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
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
  
    <Card className="col-span-1 w-full border border-slate-100 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden">
      <CardHeader className="px-4 pt-5 pb-3 border-b border-slate-50 dark:border-slate-800">
        <CardTitle className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center">
          <ChartLine className="h-5 w-5 mr-2 text-violet-500" />
          Monthly Sales Trend
        </CardTitle>
        <CardDescription className="text-xs text-slate-400 dark:text-slate-500 font-medium">Last 6 months</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 px-4 pb-4">
        <div className="h-[260px] w-full">
          <ChartContainer config={{ trend: { color: "#8b5cf6" } }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlySalesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: isMobile ? 9 : 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis 
                  tick={{ fontSize: isMobile ? 9 : 11, fill: '#94a3b8' }} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `₦${val >= 1000 ? (val / 1000).toFixed(0) + 'K' : val}`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  name="Monthly Revenue (₦)" 
                  stroke="#6366f1" 
                  strokeWidth={2.5} 
                  activeDot={{ r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff' }} 
                  dot={{ r: 3.5, fill: '#6366f1', strokeWidth: 1.5, stroke: '#ffffff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
});

const CategoryChart = memo(({ categorySales, isLoading }: { categorySales: CategorySale[], isLoading: boolean }) => {
  const isMobile = useIsMobile();
  
  if (isLoading) return <LoadingSkeleton />;

  // Custom label function that's responsive
  const renderCustomLabel = ({ name, percent }: any) => {
    const percentage = Number((percent * 100).toFixed(0));
    if (isMobile) {
      // On mobile, only show percentage if it's significant enough
      return percentage > 10 ? `${percentage}%` : '';
    }
    // On desktop, show both name and percentage, but truncate long names
    const truncatedName = name.length > 12 ? `${name.substring(0, 12)}...` : name;
    return `${truncatedName}: ${percentage}%`;
  };
  
  return (
    <Card className="col-span-1 w-full border border-slate-100 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden">
      <CardHeader className="px-4 pt-5 pb-3 border-b border-slate-50 dark:border-slate-800">
        <CardTitle className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center">
          <ChartPie className="h-5 w-5 mr-2 text-amber-500" />
          Sales by Category
        </CardTitle>
        <CardDescription className="text-xs text-slate-400 dark:text-slate-500 font-medium">Product category distribution</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 px-4 pb-4">
        <div className="h-[260px] w-full">
          <ChartContainer config={{ category: { color: "#10b981" } }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categorySales}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={isMobile ? 60 : 75}
                  innerRadius={isMobile ? 25 : 30}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="category"
                  style={{ 
                    fontSize: isMobile ? '9px' : '11px',
                    fontWeight: '500',
                    fill: '#475569'
                  }}
                >
                  {categorySales.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                  ))}
                </Pie>
                <ChartTooltip 
                  content={<ChartTooltipContent />} 
                  formatter={(value, name) => [`₦${value.toLocaleString()}`, name]}
                />
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
    <div className="space-y-4 sm:space-y-6">
      {/* Weekly Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <SalesChart salesByDate={salesByDate} isLoading={isLoading} />
        <TopProductsChart topProducts={topProducts} isLoading={isLoading} />
      </div>

      {/* Monthly Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <MonthlyTrendChart monthlySalesTrend={monthlySalesTrend} isLoading={isLoading} />
        <CategoryChart categorySales={categorySales} isLoading={isLoading} />
      </div>
    </div>
  );
});

OptimizedCharts.displayName = 'OptimizedCharts';

export default OptimizedCharts;
