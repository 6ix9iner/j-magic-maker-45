
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
      className={`${className} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${highPriority ? 'border-l-4 border-l-primary' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start justify-between pb-1 sm:pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          {Icon && <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${iconColor}`} />}
          {title}
        </CardTitle>
        {trend && (
          <div className={`text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'} flex items-center`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </div>
        )}
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0">
        <div className={`text-lg sm:text-2xl font-bold ${valueClassName}`}>
          {formattedValue}
        </div>
        {description && (
          <div className="mt-1">
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;
