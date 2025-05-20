
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChartBar } from 'lucide-react';

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

  return (
    <Card className="w-full">
      <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-1 sm:pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
        </div>
        <ChartBar className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pt-1 sm:pt-2 px-1 sm:px-3 pb-3 sm:pb-6">
        <div className="h-[300px] w-full">
          {data.length > 0 ? (
            <ChartContainer
              config={{
                revenue: { color: "#22c55e" },
                cost: { color: "#ef4444" },
                profit: { color: "#3b82f6" },
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                  <ReferenceLine y={0} stroke="#000" />
                  <Bar dataKey="revenue" name="Revenue" fill="#22c55e" />
                  <Bar dataKey="cost" name="Cost" fill="#ef4444" />
                  <Bar dataKey="profit" name="Profit" fill="#3b82f6" />
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
