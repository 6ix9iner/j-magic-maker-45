
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChartBar } from 'lucide-react';
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
        return isMobile ? value.substring(0, 3) : value;
      }
      
      if (isMobile) {
        // Show only month abbreviation on mobile
        return date.toLocaleDateString('en-US', { month: 'short' });
      }
      
      // Show month and year on desktop
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch (error) {
      console.error('Date formatting error:', error, 'for value:', value);
      return isMobile ? value.substring(0, 3) : value;
    }
  };

  // Filter out invalid data entries
  const validData = data.filter(item => {
    const hasValidNumbers = !isNaN(item.revenue) && !isNaN(item.cost) && !isNaN(item.profit);
    const hasValidDate = item.date && item.date.trim() !== '';
    return hasValidNumbers && hasValidDate;
  });

  return (
    <Card className="w-full h-full">
      <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-1 sm:pb-2 flex flex-row items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 border-b">
        <div>
          <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
        </div>
        <ChartBar className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pt-1 sm:pt-2 px-1 sm:px-3 pb-3 sm:pb-6">
        <div className="h-[300px] w-full">
          {validData.length > 0 ? (
            <ChartContainer
              config={{
                revenue: { color: "#22c55e" },
                cost: { color: "#ef4444" },
                profit: { color: "#3b82f6" },
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={validData} 
                  margin={{ 
                    top: 20, 
                    right: isMobile ? 5 : 30, 
                    left: isMobile ? 5 : 20, 
                    bottom: isMobile ? 25 : 5 
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: isMobile ? 8 : 12 }}
                    tickFormatter={formatXAxisLabel}
                    interval={0}
                    angle={isMobile ? -45 : 0}
                    textAnchor={isMobile ? 'end' : 'middle'}
                    height={isMobile ? 50 : 30}
                  />
                  <YAxis 
                    tick={{ fontSize: isMobile ? 8 : 12 }}
                    width={isMobile ? 35 : 60}
                    tickFormatter={(value) => {
                      // Abbreviate large numbers with K/M suffix
                      if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                      if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                      return `$${value}`;
                    }}
                  />
                  <Tooltip 
                    content={<ChartTooltipContent />}
                    formatter={formatTooltipValue}
                    labelFormatter={(value) => formatXAxisLabel(value)}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: isMobile ? 8 : 12 }}
                    iconType="circle"
                  />
                  <ReferenceLine y={0} stroke="#000" strokeWidth={1} />
                  <Bar 
                    dataKey="revenue" 
                    name="Revenue" 
                    fill="#22c55e"
                    radius={[2, 2, 0, 0]}
                    fillOpacity={0.8}
                  />
                  <Bar 
                    dataKey="cost" 
                    name="Cost" 
                    fill="#ef4444"
                    radius={[2, 2, 0, 0]} 
                    fillOpacity={0.8}
                  />
                  <Bar 
                    dataKey="profit" 
                    name="Profit" 
                    fill="#3b82f6"
                    radius={[2, 2, 0, 0]}
                    fillOpacity={0.8}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfitLossChart;
