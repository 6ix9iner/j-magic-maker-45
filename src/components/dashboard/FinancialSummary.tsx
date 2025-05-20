
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatPercentage, FinancialMetrics } from '@/utils/financialUtils';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface FinancialSummaryProps {
  metrics: FinancialMetrics;
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({ metrics }) => {
  const isProfit = metrics.grossProfit >= 0;
  
  const renderIndicator = (value: number) => {
    const isPositive = value >= 0;
    return (
      <div className={`flex items-center justify-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
      </div>
    );
  };

  return (
    <Card className="w-full h-full">
      <CardHeader className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 border-b">
        <CardTitle className="text-lg flex items-center">
          <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
          Financial Summary
        </CardTitle>
        <div className={`flex items-center ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
          {isProfit ? (
            <TrendingUp className="h-4 w-4 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 mr-1" />
          )}
          <span className="text-sm font-medium">
            {formatPercentage(metrics.profitMargin)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Metric</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead width="40px"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Revenue</TableCell>
              <TableCell className="text-right">{formatCurrency(metrics.totalRevenue)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Cost</TableCell>
              <TableCell className="text-right">{formatCurrency(metrics.totalCost)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow className="bg-muted/20">
              <TableCell className="font-medium">Gross Profit</TableCell>
              <TableCell className={`text-right font-medium ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(metrics.grossProfit)}
              </TableCell>
              <TableCell>
                {renderIndicator(metrics.grossProfit)}
              </TableCell>
            </TableRow>
            <TableRow className="bg-muted/20">
              <TableCell className="font-medium">Profit Margin</TableCell>
              <TableCell className={`text-right ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(metrics.profitMargin)}
              </TableCell>
              <TableCell>
                {renderIndicator(metrics.profitMargin)}
              </TableCell>
            </TableRow>
            {metrics.revenueGrowth !== undefined && (
              <TableRow>
                <TableCell className="font-medium">Growth</TableCell>
                <TableCell className={`text-right ${metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.revenueGrowth >= 0 ? '+' : ''}{metrics.revenueGrowth.toFixed(1)}%
                </TableCell>
                <TableCell>
                  {renderIndicator(metrics.revenueGrowth)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default FinancialSummary;
