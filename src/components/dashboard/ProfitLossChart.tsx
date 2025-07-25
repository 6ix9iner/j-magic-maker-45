
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
    <Card className="w-full h-full">
      <CardHeader className={`px-3 sm:px-6 pt-3 sm:pt-6 pb-1 sm:pb-2 flex flex-row items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 border-b ${isMobileDevice ? 'px-2 pt-2 pb-1' : ''}`}>
        <div>
          <CardTitle className={`text-lg sm:text-xl ${isMobileDevice ? 'text-base' : ''} flex items-center gap-2`}>
            {title}
            {isOverallProfit ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardTitle>
          <CardDescription className={`text-xs sm:text-sm ${isMobileDevice ? 'text-xs' : ''}`}>
            {description} • {isOverallProfit ? 'Profitable' : 'Loss'}
          </CardDescription>
        </div>
        <ChartBar className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      
      {/* Mobile Legend */}
      {isMobileDevice && validData.length > 0 && (
        <div className="px-2 py-2 border-b bg-muted/20">
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Revenue</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Cost</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Profit</span>
            </div>
          </div>
        </div>
      )}

      <CardContent className={`pt-1 sm:pt-2 px-1 sm:px-3 pb-3 sm:pb-6 ${isMobileDevice ? 'px-1 pt-1 pb-2' : ''}`}>
        <div className={`h-[300px] w-full ${isMobileDevice ? 'h-[250px]' : ''}`}>
          {validData.length > 0 ? (
            <ChartContainer
              config={{
                revenue: { 
                  color: "#22c55e",
                  label: "Revenue"
                },
                cost: { 
                  color: "#ef4444",
                  label: "Cost"
                },
                profit: { 
                  color: "#3b82f6",
                  label: "Profit"
                },
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={validData} 
                  margin={{ 
                    top: isMobileDevice ? 10 : 20, 
                    right: isMobileDevice ? 2 : 30, 
                    left: isMobileDevice ? 2 : 20, 
                    bottom: isMobileDevice ? 35 : 5 
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: isMobileDevice ? 7 : 12 }}
                    tickFormatter={formatXAxisLabel}
                    interval={0}
                    angle={isMobileDevice ? -45 : 0}
                    textAnchor={isMobileDevice ? 'end' : 'middle'}
                    height={isMobileDevice ? 60 : 30}
                  />
                  <YAxis 
                    tick={{ fontSize: isMobileDevice ? 7 : 12 }}
                    width={isMobileDevice ? 30 : 60}
                    tickFormatter={(value) => {
                      // Abbreviate large numbers with K/M suffix
                      if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                      if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                      return isMobileDevice ? `$${Math.round(value)}` : `$${value}`;
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
                      wrapperStyle={{ fontSize: 12 }}
                      iconType="circle"
                      formatter={(value) => {
                        if (value === 'revenue') return 'Revenue';
                        if (value === 'cost') return 'Cost';
                        if (value === 'profit') return 'Profit';
                        return value;
                      }}
                    />
                  )}
                  <ReferenceLine y={0} stroke="#000" strokeWidth={1} />
                  <Bar 
                    dataKey="revenue" 
                    name="revenue" 
                    fill="#22c55e"
                    radius={[2, 2, 0, 0]}
                    fillOpacity={0.8}
                  />
                  <Bar 
                    dataKey="cost" 
                    name="cost" 
                    fill="#ef4444"
                    radius={[2, 2, 0, 0]} 
                    fillOpacity={0.8}
                  />
                  <Bar 
                    dataKey="profit" 
                    name="profit" 
                    fill="#3b82f6"
                    radius={[2, 2, 0, 0]}
                    fillOpacity={0.8}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <DollarSign className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                <p>No financial data available</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfitLossChart;
