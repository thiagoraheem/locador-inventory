
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Package } from "lucide-react";
import { useSelectedInventory } from "@/hooks/useSelectedInventory";
import type { Inventory } from "@shared/schema";

interface SelectedInventoryInfoProps {
  showClearButton?: boolean;
  className?: string;
}

export default function SelectedInventoryInfo({ 
  showClearButton = true, 
  className = "" 
}: SelectedInventoryInfoProps) {
  const { selectedInventoryId, clearSelectedInventory } = useSelectedInventory();

  const { data: inventory } = useQuery<Inventory>({
    queryKey: [`/api/inventories/${selectedInventoryId}`],
    enabled: !!selectedInventoryId,
  });

  if (!selectedInventoryId || !inventory) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="default">Aberto</Badge>;
      case 'count1_open':
        return <Badge variant="secondary">1ª Contagem Aberta</Badge>;
      case 'count1_closed':
        return <Badge variant="secondary">1ª Contagem Fechada</Badge>;
      case 'count2_open':
        return <Badge variant="secondary">2ª Contagem Aberta</Badge>;
      case 'count2_closed':
        return <Badge variant="secondary">2ª Contagem Fechada</Badge>;
      case 'count3_open':
        return <Badge variant="secondary">3ª Contagem Aberta</Badge>;
      case 'count3_closed':
        return <Badge variant="outline">3ª Contagem Fechada</Badge>;
      case 'audit_mode':
        return <Badge variant="destructive">Modo Auditoria</Badge>;
      case 'closed':
        return <Badge variant="outline">Fechado</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className={`bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  {inventory.code}
                </span>
                {getStatusBadge(inventory.status)}
              </div>
              {inventory.description && (
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {inventory.description}
                </p>
              )}
            </div>
          </div>
          
          {showClearButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelectedInventory}
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-200 dark:hover:bg-blue-900"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
