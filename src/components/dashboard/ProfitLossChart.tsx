
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChartBar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/utils/financialUtils';

interface ProfitLossChartProps {
  data: Array<{
    date: string;
    revenue: number;
    cost: number;
    profit: number;
  }>;
  title?: string;
  description?: string;
}

const ProfitLossChart: React.FC<ProfitLossChartProps> = ({ 
  data, 
  title = "Revenue vs. Cost", 
  description = "Monthly breakdown"
}) => {
  const isMobile = useIsMobile();
  
  // Additional mobile detection for real devices
  const isRealMobile = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth <= 768
  );
  
  const isMobileDevice = isMobile || isRealMobile;

  // Custom tooltip formatter for currency values
  const formatTooltipValue = (value: number) => formatCurrency(value);

  // Enhanced date formatter that handles various date formats
  const formatXAxisLabel = (value: string) => {
    try {
      // Handle different date formats
      let date: Date;
      
      // Check if it's already in "Mon YYYY" format
      if (value.match(/^[A-Za-z]{3}\s\d{4}$/)) {
        date = new Date(`${value.split(' ')[0]} 1, ${value.split(' ')[1]}`);
      } else {
        date = new Date(value);
      }
      
      // Validate the date
      if (isNaN(date.getTime())) {
        // If date parsing fails, return the original value truncated for mobile
        return isMobileDevice ? value.substring(0, 3) : value;
      }
      
      if (isMobileDevice) {
        // Show only month abbreviation on mobile
        return date.toLocaleDateString('en-US', { month: 'short' });
      }
      
      // Show month and year on desktop
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch (error) {
      console.error('Date formatting error:', error, 'for value:', value);
      return isMobileDevice ? value.substring(0, 3) : value;
    }
  };

  // Filter out invalid data entries
  const validData = data.filter(item => {
    const hasValidNumbers = !isNaN(item.revenue) && !isNaN(item.cost) && !isNaN(item.profit);
    const hasValidDate = item.date && item.date.trim() !== '';
    return hasValidNumbers && hasValidDate;
  });

  // Calculate overall profit/loss for indicator
  const totalProfit = validData.reduce((sum, item) => sum + item.profit, 0);
  const isOverallProfit = totalProfit >= 0;

  return (
    <Card className="w-full h-full border border-slate-100 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden">
      <CardHeader className={`px-4 sm:px-6 pt-5 pb-3 flex flex-row items-center justify-between border-b border-slate-50 dark:border-slate-800 ${isMobileDevice ? 'px-3 pt-3 pb-2' : ''}`}>
        <div>
          <CardTitle className={`text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2`}>
            {title}
            {isOverallProfit ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            {description} • {isOverallProfit ? 'Profitable' : 'Loss'}
          </CardDescription>
        </div>
        <ChartBar className="h-5 w-5 text-indigo-500" />
      </CardHeader>
      
      {/* Mobile Legend */}
      {isMobileDevice && validData.length > 0 && (
        <div className="px-3 py-2 border-b border-slate-50 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-center gap-4 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
              <span>Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-rose-500 rounded-full"></div>
              <span>Cost</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></div>
              <span>Profit</span>
            </div>
          </div>
        </div>
      )}

      <CardContent className={`pt-4 px-2 sm:px-4 pb-4 ${isMobileDevice ? 'px-2 pt-2 pb-2' : ''}`}>
        <div className={`h-[300px] w-full ${isMobileDevice ? 'h-[250px]' : ''}`}>
          {validData.length > 0 ? (
            <ChartContainer
              config={{
                revenue: { 
                  color: "#10b981",
                  label: "Revenue"
                },
                cost: { 
                  color: "#f43f5e",
                  label: "Cost"
                },
                profit: { 
                  color: "#6366f1",
                  label: "Profit"
                },
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={validData} 
                  margin={{ 
                    top: isMobileDevice ? 10 : 20, 
                    right: isMobileDevice ? 2 : 20, 
                    left: isMobileDevice ? 2 : 10, 
                    bottom: isMobileDevice ? 35 : 5 
                  }}
                >
                  <defs>
                    <linearGradient id="revenue-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.95}/>
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="cost-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.95}/>
                      <stop offset="100%" stopColor="#e11d48" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="profit-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.95}/>
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: isMobileDevice ? 8 : 11, fill: '#94a3b8' }}
                    tickLine={false}
                    tickFormatter={formatXAxisLabel}
                    interval={0}
                    angle={isMobileDevice ? -45 : 0}
                    textAnchor={isMobileDevice ? 'end' : 'middle'}
                    height={isMobileDevice ? 60 : 30}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: isMobileDevice ? 8 : 11, fill: '#94a3b8' }}
                    tickLine={false}
                    width={isMobileDevice ? 40 : 60}
                    axisLine={false}
                    tickFormatter={(value) => {
                      // Abbreviate large numbers with K/M suffix in Naira
                      if (Math.abs(value) >= 1000000) return `₦${(value / 1000000).toFixed(1)}M`;
                      if (Math.abs(value) >= 1000) return `₦${(value / 1000).toFixed(0)}K`;
                      return isMobileDevice ? `₦${Math.round(value)}` : `₦${value}`;
                    }}
                  />
                  <Tooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value, name) => [
                      formatTooltipValue(Number(value)),
                      name === 'revenue' ? 'Revenue' : name === 'cost' ? 'Cost' : 'Profit'
                    ]}
                    labelFormatter={(value) => formatXAxisLabel(value)}
                  />
                  {!isMobileDevice && (
                    <Legend 
                      wrapperStyle={{ fontSize: 11, fontWeight: 500, color: '#64748b', paddingTop: 10 }}
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => {
                        if (value === 'revenue') return 'Revenue';
                        if (value === 'cost') return 'Cost';
                        if (value === 'profit') return 'Profit';
                        return value;
                      }}
                    />
                  )}
                  <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 4" />
                  <Bar 
                    dataKey="revenue" 
                    name="revenue" 
                    fill="url(#revenue-grad)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="cost" 
                    name="cost" 
                    fill="url(#cost-grad)"
                    radius={[4, 4, 0, 0]} 
                  />
                  <Bar 
                    dataKey="profit" 
                    name="profit" 
                    fill="url(#profit-grad)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <DollarSign className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium">No financial data available</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfitLossChart;
