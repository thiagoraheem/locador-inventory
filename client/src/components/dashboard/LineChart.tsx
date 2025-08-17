import React from "react";
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LineChartProps } from "../../../../shared/dashboard-types";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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

const LineChart: React.FC<LineChartProps> = ({
  data,
  title,
  xAxisKey = "name",
  yAxisKey = "value",
  color = COLORS.primary,
  showGrid = true,
  showTooltip = true,
  showLegend = false,
  showDots = true,
  curved = true,
  height = 300,
  loading = false,
  className
}) => {
  if (loading) {
    return (
      <Card className={cn("h-full", className)}>
        {title && (
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <Skeleton className="h-4 sm:h-5 w-24 sm:w-32" />
          </CardHeader>
        )}
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
              <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
            </div>
            <Skeleton className="h-32 sm:h-48 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-2 sm:h-3 w-8 sm:w-12" />
              <Skeleton className="h-2 sm:h-3 w-8 sm:w-12" />
              <Skeleton className="h-2 sm:h-3 w-8 sm:w-12" />
            </div>
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
          <RechartsLineChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            {showGrid && (
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="opacity-30" 
                vertical={false}
              />
            )}
            
            <XAxis 
              dataKey={xAxisKey} 
              className="text-xs fill-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            
            <YAxis 
              className="text-xs fill-muted-foreground"
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => 
                typeof value === 'number' ? value.toLocaleString('pt-BR') : value
              }
            />
            
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            
            <Line 
              type={curved ? "monotone" : "linear"}
              dataKey={yAxisKey} 
              stroke={color}
              strokeWidth={2}
              dot={showDots ? { fill: color, strokeWidth: 2, r: 4 } : false}
              activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Specialized Line Chart variants
export const ConsistencyTimelineChart: React.FC<{
  data: Array<{
    timestamp: string;
    accuracy: number;
    progress: number;
  }>;
  title?: string;
  loading?: boolean;
  className?: string;
}> = ({ data, title = "Timeline de Consistência", loading, className }) => {
  const chartData = data.map(item => ({
    time: format(parseISO(item.timestamp), "HH:mm", { locale: ptBR }),
    accuracy: item.accuracy,
    progress: item.progress,
    fullTime: format(parseISO(item.timestamp), "dd/MM HH:mm", { locale: ptBR })
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.fullTime}</p>
          <div className="space-y-1">
            <p className="text-sm text-green-600">
              Acuracidade: {data.accuracy.toFixed(1)}%
            </p>
            <p className="text-sm text-blue-600">
              Progresso: {data.progress.toFixed(1)}%
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
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
        <ResponsiveContainer width="100%" height={300}>
          <RechartsLineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" vertical={false} />
            <XAxis 
              dataKey="time" 
              className="text-xs fill-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              className="text-xs fill-muted-foreground"
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Line 
              type="monotone"
              dataKey="accuracy" 
              stroke={COLORS.success}
              strokeWidth={2}
              dot={{ fill: COLORS.success, strokeWidth: 2, r: 3 }}
              name="Acuracidade"
            />
            
            <Line 
              type="monotone"
              dataKey="progress" 
              stroke={COLORS.primary}
              strokeWidth={2}
              dot={{ fill: COLORS.primary, strokeWidth: 2, r: 3 }}
              name="Progresso"
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const ProgressOverTimeChart: React.FC<{
  data: Array<{
    timestamp: string;
    itemsCounted: number;
    totalItems: number;
  }>;
  title?: string;
  loading?: boolean;
  className?: string;
}> = ({ data, title = "Progresso ao Longo do Tempo", loading, className }) => {
  const chartData = data.map(item => {
    const progress = item.totalItems > 0 ? (item.itemsCounted / item.totalItems) * 100 : 0;
    return {
      time: format(parseISO(item.timestamp), "HH:mm", { locale: ptBR }),
      progress,
      counted: item.itemsCounted,
      total: item.totalItems,
      fullTime: format(parseISO(item.timestamp), "dd/MM HH:mm", { locale: ptBR })
    };
  });

  return (
    <LineChart
      data={chartData}
      title={title}
      xAxisKey="time"
      yAxisKey="progress"
      color={COLORS.primary}
      height={250}
      loading={loading}
      className={className}
    />
  );
};

export const AccuracyTrendChart: React.FC<{
  data: Array<{
    period: string;
    accuracy: number;
    target?: number;
  }>;
  title?: string;
  showTarget?: boolean;
  loading?: boolean;
  className?: string;
}> = ({ data, title = "Tendência de Acuracidade", showTarget = true, loading, className }) => {
  const chartData = data.map(item => ({
    period: item.period,
    accuracy: item.accuracy,
    target: item.target || 95
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const accuracy = payload.find((p: any) => p.dataKey === 'accuracy');
      const target = payload.find((p: any) => p.dataKey === 'target');
      
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium">{label}</p>
          <div className="space-y-1">
            {accuracy && (
              <p className="text-sm text-blue-600">
                Acuracidade: {accuracy.value.toFixed(1)}%
              </p>
            )}
            {target && showTarget && (
              <p className="text-sm text-gray-500">
                Meta: {target.value}%
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {showTarget && (
            <Badge variant="outline" className="text-xs">
              Meta: 95%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RechartsLineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" vertical={false} />
            <XAxis 
              dataKey="period" 
              className="text-xs fill-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              className="text-xs fill-muted-foreground"
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            
            <Line 
              type="monotone"
              dataKey="accuracy" 
              stroke={COLORS.primary}
              strokeWidth={3}
              dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: COLORS.primary, strokeWidth: 2 }}
            />
            
            {showTarget && (
              <Line 
                type="monotone"
                dataKey="target" 
                stroke={COLORS.secondary}
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
          </RechartsLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const MultiLineChart: React.FC<{
  data: Array<Record<string, any>>;
  lines: Array<{
    key: string;
    name: string;
    color: string;
  }>;
  title?: string;
  xAxisKey?: string;
  loading?: boolean;
  className?: string;
}> = ({ data, lines, title, xAxisKey = "name", loading, className }) => {
  if (loading) {
    return (
      <Card className={cn("h-full", className)}>
        {title && (
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
        )}
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full", className)}>
      {title && (
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RechartsLineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" vertical={false} />
            <XAxis 
              dataKey={xAxisKey} 
              className="text-xs fill-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              className="text-xs fill-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <Tooltip />
            <Legend />
            
            {lines.map((line, index) => (
              <Line 
                key={line.key}
                type="monotone"
                dataKey={line.key}
                stroke={line.color}
                strokeWidth={2}
                dot={{ fill: line.color, strokeWidth: 2, r: 3 }}
                name={line.name}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default LineChart;