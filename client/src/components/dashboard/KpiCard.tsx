import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { KpiCardProps } from "../../../../shared/dashboard-types";
import { useShowMoney, formatCurrency, hideValue } from "../../contexts/ShowMoneyContext";

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  loading = false,
  className
}) => {
  if (loading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
          <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
          <Skeleton className="h-3 sm:h-4 w-3 sm:w-4 rounded" />
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <Skeleton className="h-6 sm:h-8 w-12 sm:w-16 mb-2" />
          <Skeleton className="h-2 sm:h-3 w-16 sm:w-20" />
        </CardContent>
      </Card>
    );
  }

  const formatValue = (val: string | number): string => {
    if (typeof val === "number") {
      // Format numbers with appropriate locale
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString('pt-BR');
    }
    return val.toString();
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    
    if (trend.isPositive) {
      return <TrendingUp className="h-3 w-3 text-green-600" />;
    } else if (trend.value === 0) {
      return <Minus className="h-3 w-3 text-gray-500" />;
    } else {
      return <TrendingDown className="h-3 w-3 text-red-600" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return "text-muted-foreground";
    
    if (trend.isPositive) {
      return "text-green-600";
    } else if (trend.value === 0) {
      return "text-gray-500";
    } else {
      return "text-red-600";
    }
  };

  const formatTrendValue = (val: number): string => {
    const absValue = Math.abs(val);
    const sign = val > 0 ? "+" : val < 0 ? "-" : "";
    
    if (absValue >= 1) {
      return `${sign}${absValue.toFixed(1)}%`;
    } else {
      return `${sign}${(absValue * 100).toFixed(1)}%`;
    }
  };

  return (
    <Card className={cn("h-full transition-all duration-200 hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
          {title}
        </CardTitle>
        {icon && (
          <div className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="flex items-baseline space-x-1 sm:space-x-2">
          <div className="text-lg sm:text-2xl font-bold tracking-tight truncate">
            {formatValue(value)}
          </div>
          {trend && (
            <div className={cn("flex items-center space-x-1 text-xs flex-shrink-0", getTrendColor())}>
              {getTrendIcon()}
              <span>{formatTrendValue(trend.value)}</span>
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Specialized KPI Card variants for common dashboard metrics
export const ProgressKpiCard: React.FC<{
  progress: number;
  total: number;
  title: string;
  loading?: boolean;
  className?: string;
}> = ({ progress, total, title, loading, className }) => {
  const percentage = total > 0 ? (progress / total) * 100 : 0;
  
  return (
    <KpiCard
      title={title}
      value={`${progress}/${total}`}
      subtitle={`${percentage.toFixed(1)}% concluído`}
      loading={loading}
      className={className}
    />
  );
};

export const AccuracyKpiCard: React.FC<{
  accuracy: number;
  title?: string;
  loading?: boolean;
  className?: string;
}> = ({ accuracy, title = "Acuracidade", loading, className }) => {
  const getAccuracyColor = (acc: number) => {
    if (acc >= 95) return "text-green-600";
    if (acc >= 90) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        {loading ? (
          <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" />
        ) : (
          <div className="flex items-baseline space-x-1 sm:space-x-2">
            <div className={cn("text-lg sm:text-2xl font-bold tracking-tight", getAccuracyColor(accuracy))}>
              {accuracy.toFixed(1)}%
            </div>
            <Badge 
              variant={accuracy >= 95 ? "default" : accuracy >= 90 ? "secondary" : "destructive"}
              size="sm"
              className="text-xs flex-shrink-0"
            >
              {accuracy >= 95 ? "Excelente" : accuracy >= 90 ? "Bom" : "Atenção"}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const MoneyKpiCard: React.FC<{
  value: number;
  title: string;
  showMoney?: boolean;
  currency?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
  className?: string;
}> = ({ 
  value, 
  title, 
  showMoney = true, 
  currency = "R$", 
  trend, 
  loading, 
  className 
}) => {
  const formatCurrency = (val: number): string => {
    if (!showMoney) {
      return "***";
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(val);
  };

  return (
    <KpiCard
      title={title}
      value={formatCurrency(value)}
      trend={trend}
      loading={loading}
      className={className}
    />
  );
};

export const CurrencyKpiCard: React.FC<{
  title: string;
  value: number;
  subtitle?: string;
  trend?: number;
  isLoading?: boolean;
  currency?: string;
  showTrend?: boolean;
}> = ({ title, value, subtitle, trend, isLoading, currency = "R$", showTrend = true }) => {
  const { showMoney } = useShowMoney();
  
  const formatValue = (val: number): string => {
     if (!showMoney) {
       return '***';
     }
     return formatCurrency(val, showMoney);
   };

  const trendData = trend !== undefined && showTrend ? {
    value: trend,
    isPositive: trend >= 0
  } : undefined;

  return (
    <KpiCard
      title={title}
      value={formatCurrency(value)}
      subtitle={subtitle}
      trend={trendData}
      loading={isLoading}
    />
  );
};

export default KpiCard;