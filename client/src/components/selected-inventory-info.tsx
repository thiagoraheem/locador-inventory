import { Card, CardContent } from "@/components/ui/card";

interface SelectedInventoryInfoProps {
  inventory?: any;
}

export default function SelectedInventoryInfo({ inventory }: SelectedInventoryInfoProps) {
  if (!inventory) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Nenhum inventário selecionado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-2">
          <p className="font-medium">{inventory.code}</p>
          <p className="text-sm text-muted-foreground">{inventory.description}</p>
        </div>
      </CardContent>
    </Card>
  );
}