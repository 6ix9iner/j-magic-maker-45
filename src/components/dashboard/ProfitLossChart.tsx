
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

  return (
    <Card className="w-full h-full shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-1 sm:pb-2 flex flex-row items-center justify-between bg-gradient-to-r from-slate-50 to-slate-100 border-b">
        <div>
          <CardTitle className="text-lg sm:text-xl text-slate-800">{title}</CardTitle>
          <CardDescription className="text-xs sm:text-sm text-slate-500">{description}</CardDescription>
        </div>
        <ChartBar className="h-5 w-5 text-emerald-500" />
      </CardHeader>
      <CardContent className="pt-2 sm:pt-3 px-2 sm:px-4 pb-3 sm:pb-6">
        <div className="h-[300px] w-full">
          {data.length > 0 ? (
            <ChartContainer
              config={{
                revenue: { color: "#10b981" },  // emerald-500
                cost: { color: "#f43f5e" },     // rose-500
                profit: { color: "#3b82f6" },   // blue-500
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: isMobile ? 10 : 12, fill: "#64748b" }} />
                  <YAxis 
                    tick={{ fontSize: isMobile ? 10 : 12, fill: "#64748b" }}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                      return `$${value}`;
                    }}
                  />
                  <Tooltip 
                    content={<ChartTooltipContent />}
                    formatter={formatTooltipValue}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: isMobile ? 10 : 12 }}
                    iconType="circle"
                  />
                  <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} />
                  <Bar 
                    dataKey="revenue" 
                    name="Revenue" 
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    fillOpacity={0.85}
                  />
                  <Bar 
                    dataKey="cost" 
                    name="Cost" 
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]} 
                    fillOpacity={0.85}
                  />
                  <Bar 
                    dataKey="profit" 
                    name="Profit" 
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    fillOpacity={0.85}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              No data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfitLossChart;
