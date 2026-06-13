
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertCircle, Sparkles, TrendingUp, TrendingDown, DollarSign, Calendar, LayoutGrid, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MetricCard from '@/components/dashboard/MetricCard';
import ProfitLossChart from '@/components/dashboard/ProfitLossChart';
import FinancialSummary from '@/components/dashboard/FinancialSummary';
import OptimizedCharts from '@/components/dashboard/OptimizedCharts';
import { formatCurrency } from '@/utils/financialUtils';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAIInsights } from '@/hooks/useAIInsights';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useDashboardData(user);
  const { aiInsights, isLoadingAI, generateInsights } = useAIInsights();

  const navigateToInventory = () => {
    navigate('/inventory');
  };

  const refreshAIInsights = async () => {
    if (!user) return;
    await generateInsights(data);
  };

  const handleRetry = () => {
    console.log('Retrying dashboard data fetch...');
    refetch();
  };

  // Get current day and month for the welcome message
  const today = new Date();
  const currentDay = today.toLocaleDateString('en-US', { weekday: 'long' });
  const currentMonth = today.toLocaleDateString('en-US', { month: 'long' });
  const currentDate = today.getDate();

  // Show error state if there's an error
  if (error && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-4 px-3 sm:py-6 sm:px-4 md:py-8 md:px-6">
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <AlertCircle className="h-16 w-16 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900">Failed to Load Dashboard</h2>
            <p className="text-gray-600 text-center max-w-md">
              We're having trouble loading your dashboard data. Please check your connection and try again.
            </p>
            <Button onClick={handleRetry} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2 px-1 sm:py-4 sm:px-2">
      <div className="w-full max-w-7xl mx-auto space-y-5">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
              Dashboard
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-medium">
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

            {error && (
              <Button variant="outline" size="sm" onClick={handleRetry}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </header>

        {/* Strategic KPI Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
          <MetricCard 
            title="Total Sales" 
            value={formatCurrency(data.totalSales)} 
            icon={DollarSign} 
            iconColor="text-green-500" 
            highPriority={true} 
          />
          
          <MetricCard 
            title="Gross Profit" 
            value={formatCurrency(data.financialMetrics.grossProfit)} 
            icon={TrendingUp} 
            iconColor={data.financialMetrics.grossProfit >= 0 ? "text-green-500" : "text-red-500"} 
            valueClassName={data.financialMetrics.grossProfit >= 0 ? "text-green-600" : "text-red-600"} 
            trend={data.financialMetrics.revenueGrowth !== undefined ? {
              value: Math.round(data.financialMetrics.revenueGrowth * 10) / 10,
              isPositive: data.financialMetrics.revenueGrowth >= 0
            } : undefined} 
            highPriority={true} 
          />
          
          <MetricCard 
            title="Profit Margin" 
            value={`${data.financialMetrics.profitMargin.toFixed(1)}%`} 
            icon={data.financialMetrics.profitMargin >= 0 ? TrendingUp : TrendingDown} 
            iconColor={data.financialMetrics.profitMargin >= 0 ? "text-green-500" : "text-red-500"} 
            valueClassName={data.financialMetrics.profitMargin >= 0 ? "text-green-600" : "text-red-600"} 
          />
          
          <Popover>
            <PopoverTrigger asChild>
              <div className="contents">
                <MetricCard 
                  title="Low Stock Alert" 
                  value={data.lowStockCount} 
                  icon={AlertCircle} 
                  iconColor="text-red-500" 
                  valueClassName="text-red-500" 
                  description={data.lowStockCount > 0 ? "Action needed" : "All items stocked"} 
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
              {data.lowStockProducts.length > 0 ? <div className="max-h-[300px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.lowStockProducts.map(product => <TableRow key={product.id}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell className="text-right font-medium text-red-500">{product.stock_count}</TableCell>
                        </TableRow>)}
                    </TableBody>
                  </Table>
                </div> : <div className="p-4 text-center text-muted-foreground">
                  {isLoading ? 'Loading products...' : 'No low stock products'}
                </div>}
              <div className="p-3 border-t">
                <Button variant="outline" className="w-full" onClick={navigateToInventory}>
                  Go to Inventory
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Additional KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
          <MetricCard 
            title="Total Products" 
            value={data.totalProducts} 
            icon={LayoutGrid} 
            description="Active inventory items" 
          />
          
          <MetricCard 
            title="Recent Orders" 
            value={data.salesByDate.reduce((sum, day) => sum + day.count, 0)} 
            icon={Calendar} 
            description="Last 7 days" 
          />
          
          <MetricCard 
            title="Avg. Order Value" 
            value={formatCurrency(data.salesByDate.length > 0 ? data.totalSales / data.salesByDate.reduce((sum, day) => sum + day.count, 0) : 0)} 
            icon={DollarSign} 
            description="Last 7 days" 
          />
        </div>

        <Tabs defaultValue="financial" className="w-full">
          <TabsList className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-11 w-fit border-0">
            <TabsTrigger value="financial" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 text-slate-500 dark:text-slate-400 font-semibold rounded-lg transition-all h-9 px-4 text-xs sm:text-sm">Financial Analysis</TabsTrigger>
            <TabsTrigger value="insights" id="insights-tab" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 text-slate-500 dark:text-slate-400 font-semibold rounded-lg transition-all h-9 px-4 text-xs sm:text-sm">AI Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="financial" className="mt-4 space-y-4 sm:space-y-6">
            {/* Financial Analysis Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="col-span-1 lg:col-span-2">
                <ProfitLossChart 
                  data={data.profitLossData} 
                  title="Revenue vs. Cost" 
                  description="Monthly breakdown" 
                />
              </div>
              <div className="col-span-1">
                <FinancialSummary metrics={data.financialMetrics} />
              </div>
            </div>

            {/* Weekly and Monthly Analysis */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-primary" />
                Sales Analysis
              </h2>
              <OptimizedCharts 
                salesByDate={data.salesByDate} 
                topProducts={data.topProducts} 
                monthlySalesTrend={data.monthlySalesTrend} 
                categorySales={data.categorySales} 
                isLoading={isLoading} 
              />
            </div>
          </TabsContent>

          <TabsContent value="insights" className="mt-4">
            <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="px-5 py-4 flex flex-row items-center justify-between border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-500" />
                    AI Financial Insights
                  </CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={refreshAIInsights} disabled={isLoadingAI} className="h-9 rounded-xl text-xs border-slate-200 hover:bg-slate-100/50">
                  {isLoadingAI ? 'Analyzing...' : 'Refresh'}
                </Button>
              </CardHeader>
              <CardContent className="p-5 bg-white dark:bg-slate-900">
                <div className="space-y-3">
                  {isLoadingAI ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="animate-spin h-7 w-7 mb-3 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
                      <p className="text-sm font-medium text-slate-500">Analyzing your business data...</p>
                    </div>
                  ) : (
                    aiInsights.map((insight, index) => (
                      <div key={index} className="flex items-start gap-3 p-3.5 rounded-2xl bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/20 dark:border-indigo-900/20">
                        <div className="bg-indigo-100/60 dark:bg-indigo-900/40 rounded-lg p-1.5 flex-shrink-0">
                          <Sparkles className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{insight}</p>
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
