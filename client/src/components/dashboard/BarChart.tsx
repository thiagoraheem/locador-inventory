import React from "react";
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BarChartProps, ChartDataItem } from "../../../../shared/dashboard-types";
import { useShowMoney, formatCurrency } from "../../contexts/ShowMoneyContext";

const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#06b6d4",
  secondary: "#6b7280",
  purple: "#8b5cf6",
  pink: "#ec4899",
  indigo: "#6366f1",
  teal: "#14b8a6"
};

const DEFAULT_COLORS = [
  COLORS.primary,
  COLORS.success,
  COLORS.warning,
  COLORS.danger,
  COLORS.info,
  COLORS.secondary,
  COLORS.purple,
  COLORS.pink,
  COLORS.indigo,
  COLORS.teal
];

const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  xAxisKey = "name",
  yAxisKey = "value",
  color = COLORS.primary,
  orientation = "vertical",
  showGrid = true,
  showTooltip = true,
  showLegend = false,
  height = 300,
  loading = false,
  className
}) => {
  const { showMoney } = useShowMoney();
  if (loading) {
    return (
      <Card className={cn("h-full", className)}>
        {title && (
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <Skeleton className="h-4 sm:h-5 w-24 sm:w-32" />
          </CardHeader>
        )}
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="space-y-2 sm:space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-2 sm:space-x-3">
                <Skeleton className="h-3 sm:h-4 w-12 sm:w-16 flex-shrink-0" />
                <Skeleton className={`h-4 sm:h-6 flex-1 max-w-${['20', '32', '24', '28', '16'][i-1]}`} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            {typeof data.value === 'number' 
              ? data.value.toLocaleString('pt-BR')
              : data.value
            }
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={cn("h-full", className)}>
      {title && (
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          <CardTitle className="text-base sm:text-lg font-semibold truncate">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart
            data={data}
            layout={orientation}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            
            {orientation === "vertical" ? (
              <>
                <XAxis 
                  type="number" 
                  className="text-xs fill-muted-foreground"
                  tickFormatter={(value) => 
                    typeof value === 'number' ? value.toLocaleString('pt-BR') : value
                  }
                />
                <YAxis 
                  type="category" 
                  dataKey={xAxisKey} 
                  className="text-xs fill-muted-foreground"
                  width={80}
                />
              </>
            ) : (
              <>
                <XAxis 
                  type="category" 
                  dataKey={xAxisKey} 
                  className="text-xs fill-muted-foreground"
                />
                <YAxis 
                  type="number" 
                  className="text-xs fill-muted-foreground"
                  tickFormatter={(value) => 
                    typeof value === 'number' ? value.toLocaleString('pt-BR') : value
                  }
                />
              </>
            )}
            
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            
            <Bar 
              dataKey={yAxisKey} 
              fill={color}
              radius={orientation === "vertical" ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            />
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Specialized Bar Chart variants
export const DivergenceBarChart: React.FC<{
  data: Array<{
    type: string;
    count: number;
    value?: number;
  }>;
  title?: string;
  showValues?: boolean;
  loading?: boolean;
  className?: string;
}> = ({ data, title = "Divergências por Tipo", showValues = false, loading, className }) => {
  const chartData = data.map(item => ({
    name: item.type,
    count: item.count,
    value: item.value || 0
  }));

  const getColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "falta":
      case "missing":
        return COLORS.danger;
      case "sobra":
      case "excess":
        return COLORS.warning;
      case "diferença":
      case "difference":
        return COLORS.info;
      default:
        return COLORS.secondary;
    }
  };

  if (loading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {chartData.map((item, index) => {
            const maxCount = Math.max(...chartData.map(d => d.count));
            const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            
            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">
                      {item.count} itens
                    </span>
                    {showValues && item.value > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {showMoney ? formatCurrency(item.value) : '***'}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: getColor(item.name)
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export const LocationProgressBarChart: React.FC<{
  data: Array<{
    location: string;
    counted: number;
    total: number;
  }>;
  title?: string;
  loading?: boolean;
  className?: string;
}> = ({ data, title = "Progresso por Localização", loading, className }) => {
  if (loading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => {
            const percentage = item.total > 0 ? (item.counted / item.total) * 100 : 0;
            const isComplete = percentage >= 100;
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{item.location}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">
                      {item.counted}/{item.total}
                    </span>
                    <Badge 
                      variant={isComplete ? "default" : "outline"}
                      className="text-xs"
                    >
                      {percentage.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      isComplete ? "bg-green-500" : "bg-blue-500"
                    )}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export const CountRoundsBarChart: React.FC<{
  data: Array<{
    round: number;
    items: number;
  }>;
  title?: string;
  loading?: boolean;
  className?: string;
}> = ({ data, title = "Itens por Rodada de Contagem", loading, className }) => {
  const chartData = data.map(item => ({
    name: `${item.round}ª Rodada`,
    value: item.items
  }));

  const getColor = (round: number) => {
    switch (round) {
      case 1:
        return COLORS.primary;
      case 2:
        return COLORS.warning;
      case 3:
        return COLORS.danger;
      default:
        return COLORS.secondary;
    }
  };

  return (
    <BarChart
      data={chartData}
      title={title}
      color={COLORS.primary}
      orientation="horizontal"
      height={250}
      loading={loading}
      className={className}
    />
  );
};

export const TopItemsBarChart: React.FC<{
  data: Array<{
    item: string;
    count: number;
    value?: number;
  }>;
  title?: string;
  maxItems?: number;
  loading?: boolean;
  className?: string;
}> = ({ data, title = "Top Itens", maxItems = 10, loading, className }) => {
  const sortedData = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, maxItems);

  const chartData = sortedData.map(item => ({
    name: item.item.length > 20 ? `${item.item.substring(0, 20)}...` : item.item,
    value: item.count,
    fullName: item.item
  }));

  return (
    <BarChart
      data={chartData}
      title={title}
      color={COLORS.info}
      orientation="horizontal"
      height={Math.max(250, chartData.length * 40)}
      loading={loading}
      className={className}
    />
  );
};

export default BarChart;