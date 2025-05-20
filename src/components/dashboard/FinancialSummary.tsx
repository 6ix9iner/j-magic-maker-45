
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

  return (
    <Card className="w-full">
      <CardHeader className="px-4 py-3 flex items-center justify-between">
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
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Revenue</TableCell>
              <TableCell className="text-right">{formatCurrency(metrics.totalRevenue)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Cost</TableCell>
              <TableCell className="text-right">{formatCurrency(metrics.totalCost)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Gross Profit</TableCell>
              <TableCell className={`text-right font-medium ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(metrics.grossProfit)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Profit Margin</TableCell>
              <TableCell className={`text-right ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(metrics.profitMargin)}
              </TableCell>
            </TableRow>
            {metrics.revenueGrowth !== undefined && (
              <TableRow>
                <TableCell className="font-medium">Revenue Growth</TableCell>
                <TableCell className={`text-right ${metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.revenueGrowth >= 0 ? '+' : ''}{metrics.revenueGrowth.toFixed(1)}%
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
