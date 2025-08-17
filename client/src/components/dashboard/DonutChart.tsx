import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DonutChartProps, ChartDataItem } from "../../../../shared/dashboard-types";

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

const DonutChart: React.FC<DonutChartProps> = ({
  data,
  title,
  colors = DEFAULT_COLORS,
  showLegend = true,
  showTooltip = true,
  showCenter = true,
  centerContent,
  size = "default",
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
          <div className="flex items-center justify-center">
            <Skeleton className={cn(
              "rounded-full",
              size === "sm" ? "h-24 w-24 sm:h-32 sm:w-32" : 
              size === "lg" ? "h-48 w-48 sm:h-64 sm:w-64" : 
              "h-32 w-32 sm:h-48 sm:w-48"
            )} />
          </div>
          {showLegend && (
            <div className="mt-3 sm:mt-4 space-y-1 sm:space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Skeleton className="h-2 w-2 sm:h-3 sm:w-3 rounded" />
                  <Skeleton className="h-2 sm:h-3 w-16 sm:w-20" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  const getSize = () => {
    // Responsive sizes based on screen size
    const isMobile = window.innerWidth < 640; // sm breakpoint
    
    switch (size) {
      case "sm":
        return isMobile 
          ? { width: 160, height: 160, innerRadius: 30, outerRadius: 60 }
          : { width: 200, height: 200, innerRadius: 40, outerRadius: 80 };
      case "lg":
        return isMobile 
          ? { width: 280, height: 280, innerRadius: 60, outerRadius: 120 }
          : { width: 400, height: 400, innerRadius: 80, outerRadius: 160 };
      default:
        return isMobile 
          ? { width: 220, height: 220, innerRadius: 45, outerRadius: 90 }
          : { width: 300, height: 300, innerRadius: 60, outerRadius: 120 };
    }
  };

  const chartSize = getSize();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : "0";
      
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value.toLocaleString('pt-BR')} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap gap-1 sm:gap-2 justify-center mt-3 sm:mt-4">
        {payload.map((entry: any, index: number) => {
          const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(1) : "0";
          return (
            <div key={index} className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
              <div 
                className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-foreground truncate">
                {entry.payload.name}: {percentage}%
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCenterContent = () => {
    if (!showCenter) return null;
    
    if (centerContent) {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            {centerContent}
          </div>
        </div>
      );
    }

    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center px-2">
          <div className="text-lg sm:text-2xl font-bold text-foreground">
            {total.toLocaleString('pt-BR')}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground">
            Total
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={cn("h-full", className)}>
      {title && (
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          <CardTitle className="text-base sm:text-lg font-semibold truncate">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="relative">
          <ResponsiveContainer width="100%" height={chartSize.height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={chartSize.innerRadius}
                outerRadius={chartSize.outerRadius}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={colors[index % colors.length]} 
                  />
                ))}
              </Pie>
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend content={<CustomLegend />} />}
            </PieChart>
          </ResponsiveContainer>
          {renderCenterContent()}
        </div>
      </CardContent>
    </Card>
  );
};

// Specialized Donut Chart variants
export const AccuracyDonutChart: React.FC<{
  accurate: number;
  inaccurate: number;
  title?: string;
  loading?: boolean;
  className?: string;
}> = ({ accurate, inaccurate, title = "Acuracidade", loading, className }) => {
  const total = accurate + inaccurate;
  const accuracyPct = total > 0 ? (accurate / total) * 100 : 0;
  
  const data: ChartDataItem[] = [
    { name: "Preciso", value: accurate },
    { name: "Impreciso", value: inaccurate }
  ];

  const colors = [COLORS.success, COLORS.danger];

  const centerContent = (
    <div>
      <div className="text-2xl font-bold text-foreground">
        {accuracyPct.toFixed(1)}%
      </div>
      <div className="text-sm text-muted-foreground">
        Acuracidade
      </div>
    </div>
  );

  return (
    <DonutChart
      data={data}
      title={title}
      colors={colors}
      centerContent={centerContent}
      loading={loading}
      className={className}
    />
  );
};

export const StatusDonutChart: React.FC<{
  pending: number;
  inProgress: number;
  completed: number;
  title?: string;
  loading?: boolean;
  className?: string;
}> = ({ pending, inProgress, completed, title = "Status dos Itens", loading, className }) => {
  const data: ChartDataItem[] = [
    { name: "Pendente", value: pending },
    { name: "Em Andamento", value: inProgress },
    { name: "Concluído", value: completed }
  ];

  const colors = [COLORS.secondary, COLORS.warning, COLORS.success];
  const total = pending + inProgress + completed;
  const completedPct = total > 0 ? (completed / total) * 100 : 0;

  const centerContent = (
    <div>
      <div className="text-2xl font-bold text-foreground">
        {completedPct.toFixed(0)}%
      </div>
      <div className="text-sm text-muted-foreground">
        Concluído
      </div>
    </div>
  );

  return (
    <DonutChart
      data={data}
      title={title}
      colors={colors}
      centerContent={centerContent}
      loading={loading}
      className={className}
    />
  );
};

export const DivergenceDonutChart: React.FC<{
  noDivergence: number;
  minorDivergence: number;
  majorDivergence: number;
  title?: string;
  loading?: boolean;
  className?: string;
}> = ({ 
  noDivergence, 
  minorDivergence, 
  majorDivergence, 
  title = "Divergências", 
  loading, 
  className 
}) => {
  const data: ChartDataItem[] = [
    { name: "Sem Divergência", value: noDivergence },
    { name: "Divergência Menor", value: minorDivergence },
    { name: "Divergência Maior", value: majorDivergence }
  ];

  const colors = [COLORS.success, COLORS.warning, COLORS.danger];
  const total = noDivergence + minorDivergence + majorDivergence;
  const noDivergencePct = total > 0 ? (noDivergence / total) * 100 : 0;

  const centerContent = (
    <div>
      <div className="text-2xl font-bold text-foreground">
        {noDivergencePct.toFixed(0)}%
      </div>
      <div className="text-sm text-muted-foreground">
        Sem Divergência
      </div>
    </div>
  );

  return (
    <DonutChart
      data={data}
      title={title}
      colors={colors}
      centerContent={centerContent}
      loading={loading}
      className={className}
    />
  );
};

export const LocationDonutChart: React.FC<{
  locations: Array<{ name: string; count: number; }>;
  title?: string;
  loading?: boolean;
  className?: string;
}> = ({ locations, title = "Itens por Localização", loading, className }) => {
  const data: ChartDataItem[] = locations.map(loc => ({
    name: loc.name,
    value: loc.count
  }));

  const total = locations.reduce((sum, loc) => sum + loc.count, 0);

  const centerContent = (
    <div>
      <div className="text-2xl font-bold text-foreground">
        {locations.length}
      </div>
      <div className="text-sm text-muted-foreground">
        Localizações
      </div>
    </div>
  );

  return (
    <DonutChart
      data={data}
      title={title}
      centerContent={centerContent}
      loading={loading}
      className={className}
    />
  );
};

export default DonutChart;