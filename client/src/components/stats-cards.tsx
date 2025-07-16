import { Card, CardContent } from "@/components/ui/card";
import { Package, ClipboardList, Warehouse, History } from "lucide-react";

interface StatsCardsProps {
  stats: {
    totalProducts: number;
    activeInventories: number;
    stockLocations: number;
    lastAuditDays: number;
  };
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total de Produtos",
      value: stats.totalProducts.toLocaleString(),
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
      trend: "+12%",
      trendText: "vs mês anterior",
    },
    {
      title: "Inventários Ativos",
      value: stats.activeInventories.toString(),
      icon: ClipboardList,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      trend: "3 pendentes",
      trendText: "para revisão",
    },
    {
      title: "Locais de Estoque",
      value: stats.stockLocations.toString(),
      icon: Warehouse,
      color: "text-green-600",
      bgColor: "bg-green-50",
      trend: "100%",
      trendText: "operacionais",
    },
    {
      title: "Última Auditoria",
      value: stats.lastAuditDays.toString(),
      icon: History,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      trend: "",
      trendText: "dias atrás",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        
        return (
          <Card key={card.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{card.title}</p>
                  <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                </div>
                <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                {card.trend && (
                  <span className="text-green-600 text-sm font-medium">{card.trend}</span>
                )}
                <span className="text-gray-600 text-sm ml-2">{card.trendText}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
