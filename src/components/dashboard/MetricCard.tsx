
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
  className?: string;
  valueClassName?: string;
  highPriority?: boolean; // New prop to mark high priority metrics
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  iconColor = "text-gray-500",
  trend,
  onClick,
  className = "",
  valueClassName = "",
  highPriority = false
}) => {
  const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
  
  return (
    <Card 
      className={`${className} overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-200 transition-all duration-300 transform active:scale-[0.98]' : ''} ${highPriority ? 'border-l-4 border-l-indigo-600' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 px-4 pt-4">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 shrink-0">
              <Icon className={`h-4 w-4 ${iconColor}`} />
            </div>
          )}
          <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </span>
        </div>
        {trend && (
          <div className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${trend.isPositive ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'} flex items-center`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </div>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-1">
        <div className={`text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 ${valueClassName}`}>
          {formattedValue}
        </div>
        {description && (
          <div className="mt-1">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;
