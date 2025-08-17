import React from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ProgressBarProps } from "../../../../shared/dashboard-types";

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercentage = true,
  showValues = false,
  variant = "default",
  size = "default",
  loading = false,
  className
}) => {
  if (loading) {
    return (
      <div className={cn("space-y-1 sm:space-y-2", className)}>
        {label && <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />}
        <Skeleton className={cn(
          "w-full rounded-full",
          size === "sm" ? "h-1 sm:h-2" : size === "lg" ? "h-3 sm:h-4" : "h-2 sm:h-3"
        )} />
        {(showPercentage || showValues) && (
          <Skeleton className="h-2 sm:h-3 w-12 sm:w-16" />
        )}
      </div>
    );
  }

  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  
  const getVariantClass = () => {
    switch (variant) {
      case "success":
        return "[&>div]:bg-green-500";
      case "warning":
        return "[&>div]:bg-yellow-500";
      case "danger":
        return "[&>div]:bg-red-500";
      case "info":
        return "[&>div]:bg-blue-500";
      default:
        return "";
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case "sm":
        return "h-2";
      case "lg":
        return "h-4";
      default:
        return "h-3";
    }
  };

  const getStatusBadge = () => {
    if (percentage >= 100) {
      return <Badge variant="default" className="text-xs">Concluído</Badge>;
    } else if (percentage >= 75) {
      return <Badge variant="secondary" className="text-xs">Quase lá</Badge>;
    } else if (percentage >= 50) {
      return <Badge variant="outline" className="text-xs">Em andamento</Badge>;
    } else if (percentage > 0) {
      return <Badge variant="outline" className="text-xs">Iniciado</Badge>;
    } else {
      return <Badge variant="secondary" className="text-xs">Pendente</Badge>;
    }
  };

  return (
    <div className={cn("space-y-1 sm:space-y-2", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium text-foreground truncate">{label}</span>
          {showPercentage && (
            <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0 ml-2">
              {percentage.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      
      <Progress 
        value={percentage} 
        className={cn(
          "w-full transition-all duration-300",
          getSizeClass(),
          getVariantClass()
        )}
      />
      
      {(showValues || (!label && showPercentage)) && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {showValues && (
            <span className="truncate">{value.toLocaleString('pt-BR')} / {max.toLocaleString('pt-BR')}</span>
          )}
          {!label && showPercentage && (
            <span className="flex-shrink-0">{percentage.toFixed(1)}%</span>
          )}
        </div>
      )}
    </div>
  );
};

// Specialized Progress Bar variants
export const CountingProgressBar: React.FC<{
  counted: number;
  total: number;
  label?: string;
  showStatus?: boolean;
  loading?: boolean;
  className?: string;
}> = ({ counted, total, label, showStatus = true, loading, className }) => {
  const percentage = total > 0 ? (counted / total) * 100 : 0;
  
  const getVariant = () => {
    if (percentage >= 100) return "success";
    if (percentage >= 75) return "info";
    if (percentage >= 50) return "warning";
    return "default";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <ProgressBar
        value={counted}
        max={total}
        label={label}
        variant={getVariant()}
        showValues
        loading={loading}
      />
      {showStatus && !loading && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground truncate">
            {counted} de {total} itens contados
          </span>
          <Badge 
            variant={percentage >= 100 ? "default" : "outline"}
            size="sm"
            className="text-xs flex-shrink-0 ml-2"
          >
            {percentage >= 100 ? "Completo" : `${percentage.toFixed(0)}%`}
          </Badge>
        </div>
      )}
    </div>
  );
};

export const AccuracyProgressBar: React.FC<{
  accuracy: number;
  label?: string;
  loading?: boolean;
  className?: string;
}> = ({ accuracy, label = "Acuracidade", loading, className }) => {
  const getVariant = () => {
    if (accuracy >= 95) return "success";
    if (accuracy >= 90) return "warning";
    return "danger";
  };

  const getStatusText = () => {
    if (accuracy >= 95) return "Excelente";
    if (accuracy >= 90) return "Bom";
    if (accuracy >= 80) return "Regular";
    return "Atenção";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <ProgressBar
        value={accuracy}
        max={100}
        label={label}
        variant={getVariant()}
        showPercentage
        loading={loading}
      />
      {!loading && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Meta: 95%
          </span>
          <Badge 
            variant={accuracy >= 95 ? "default" : accuracy >= 90 ? "secondary" : "destructive"}
            size="sm"
            className="text-xs flex-shrink-0"
          >
            {getStatusText()}
          </Badge>
        </div>
      )}
    </div>
  );
};

export const MultiProgressBar: React.FC<{
  segments: Array<{
    value: number;
    label: string;
    color: string;
  }>;
  total: number;
  label?: string;
  loading?: boolean;
  className?: string;
}> = ({ segments, total, label, loading, className }) => {
  if (loading) {
    return (
      <div className={cn("space-y-1 sm:space-y-2", className)}>
        {label && <Skeleton className="h-3 sm:h-4 w-24 sm:w-32" />}
        <Skeleton className="h-2 sm:h-3 w-full rounded-full" />
        <div className="flex flex-wrap gap-2 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-2 sm:h-3 w-12 sm:w-16" />
          ))}
        </div>
      </div>
    );
  }

  const totalValue = segments.reduce((sum, segment) => sum + segment.value, 0);
  
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium text-foreground truncate">{label}</span>
          <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0 ml-2">
            {totalValue.toLocaleString('pt-BR')} / {total.toLocaleString('pt-BR')}
          </span>
        </div>
      )}
      
      <div className="w-full bg-muted rounded-full h-2 sm:h-3 overflow-hidden">
        <div className="h-full flex">
          {segments.map((segment, index) => {
            const percentage = total > 0 ? (segment.value / total) * 100 : 0;
            return (
              <div
                key={index}
                className="h-full transition-all duration-300"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: segment.color
                }}
              />
            );
          })}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1 sm:gap-2">
        {segments.map((segment, index) => {
          const percentage = total > 0 ? (segment.value / total) * 100 : 0;
          return (
            <div key={index} className="flex items-center space-x-1 text-xs">
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-muted-foreground truncate">
                {segment.label}: {segment.value.toLocaleString('pt-BR')} ({percentage.toFixed(1)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;