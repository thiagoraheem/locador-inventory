import { Button } from "@/components/ui/button";

interface StockFormProps {
  stock?: any;
  onSuccess?: () => void;
}

export default function StockForm({ stock, onSuccess }: StockFormProps) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">Formulário de estoque em desenvolvimento</p>
      <Button onClick={onSuccess}>Fechar</Button>
    </div>
  );
}