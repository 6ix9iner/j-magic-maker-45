
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
  highPriority?: boolean;
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
      className={`${className} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${
        highPriority ? 'border-l-[3px] border-l-emerald-500 shadow-sm' : 'shadow-sm'
      } overflow-hidden hover:shadow-md transition-all duration-200`}
      onClick={onClick}
    >
      <CardHeader className={`flex flex-row items-start justify-between pb-1.5 sm:pb-2 px-3 sm:px-4 pt-3 sm:pt-4 ${
        highPriority ? 'bg-gradient-to-r from-slate-50 to-slate-100' : ''
      }`}>
        <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 flex items-center gap-1.5">
          {Icon && <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${iconColor}`} />}
          {title}
        </CardTitle>
        {trend && (
          <div className={`text-xs font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'} flex items-center`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </div>
        )}
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0">
        <div className={`text-lg sm:text-2xl font-bold ${valueClassName || 'text-slate-800'}`}>
          {formattedValue}
        </div>
        {description && (
          <div className="mt-1">
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;
