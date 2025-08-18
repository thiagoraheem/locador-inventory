import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useSelectedInventory } from "@/hooks/useSelectedInventory";
import type { Inventory } from "@shared/schema";

interface SelectedInventoryInfoProps {
  inventory?: any;
}

export default function SelectedInventoryInfo({ inventory }: SelectedInventoryInfoProps) {
  const { selectedInventoryId, setSelectedInventoryId } = useSelectedInventory();
  
  // Query para buscar todos os inventários disponíveis
  const { data: inventories } = useQuery<Inventory[]>({
    queryKey: ["/api/inventories"],
  });

  const handleInventoryChange = (inventoryId: string) => {
    setSelectedInventoryId(Number(inventoryId));
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Inventário Selecionado</h3>
          </div>
          
          <div className="space-y-2">
            <Select 
              value={selectedInventoryId?.toString() || ""} 
              onValueChange={handleInventoryChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um inventário" />
              </SelectTrigger>
              <SelectContent>
                {inventories?.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id.toString()}>
                    <div className="flex flex-col">
                      <span className="font-medium">{inv.code}</span>
                      <span className="text-sm text-muted-foreground">{inv.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {inventory && (
              <div className="pt-2 border-t">
                <p className="font-medium">{inventory.code}</p>
                <p className="text-sm text-muted-foreground">{inventory.description}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}