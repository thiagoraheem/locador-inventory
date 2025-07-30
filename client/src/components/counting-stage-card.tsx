import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, User, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CountingStageCardProps {
  itemId: number;
  stage: 1 | 2 | 3 | 4;
  currentCount?: number;
  countedBy?: string;
  countedAt?: number;
  expectedQuantity: number;
  isDisabled?: boolean;
  onCountUpdate?: () => void;
}

export default function CountingStageCard({
  itemId,
  stage,
  currentCount,
  countedBy,
  countedAt,
  expectedQuantity,
  isDisabled = false,
  onCountUpdate
}: CountingStageCardProps) {
  const [count, setCount] = useState(currentCount?.toString() || "");
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateCountMutation = useMutation({
    mutationFn: async (countValue: number) => {
      const response = await fetch(`/api/inventory-items/${itemId}/count${stage}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ count: countValue }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update count');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contagem atualizada",
        description: `${stage}ª contagem registrada com sucesso`,
      });
      setIsEditing(false);
      onCountUpdate?.();
      queryClient.invalidateQueries({ queryKey: [`/api/inventory-items`] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar contagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const countValue = parseInt(count);
    if (isNaN(countValue) || countValue < 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um número válido",
        variant: "destructive",
      });
      return;
    }
    
    updateCountMutation.mutate(countValue);
  };

  const handleCancel = () => {
    setCount(currentCount?.toString() || "");
    setIsEditing(false);
  };

  const getStageLabel = () => {
    switch (stage) {
      case 1: return "1ª Contagem";
      case 2: return "2ª Contagem";
      case 3: return "3ª Contagem";
      case 4: return "Auditoria";
      default: return `${stage}ª Contagem`;
    }
  };

  const getStageColor = () => {
    if (currentCount !== undefined) return "default";
    if (isDisabled) return "outline";
    return stage === 1 ? "secondary" : "outline";
  };

  const getDifference = () => {
    if (currentCount === undefined) return null;
    return currentCount - expectedQuantity;
  };

  const difference = getDifference();
  const hasDivergence = difference !== null && Math.abs(difference) > 0;

  return (
    <Card className={`${isDisabled ? 'opacity-50' : ''} ${hasDivergence ? 'border-orange-200' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{getStageLabel()}</CardTitle>
          <Badge variant={getStageColor()}>
            {currentCount !== undefined ? (
              <div className="flex items-center gap-1">
                <Check className="h-3 w-3" />
                Concluída
              </div>
            ) : isDisabled ? (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Aguardando
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Pendente
              </div>
            )}
          </Badge>
        </div>
        <CardDescription>
          Quantidade esperada: <span className="font-medium">{expectedQuantity}</span>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {currentCount !== undefined && !isEditing ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Quantidade contada:</span>
                <span className="text-2xl font-bold">{currentCount}</span>
              </div>
              
              {difference !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Diferença:</span>
                  <div className="flex items-center gap-2">
                    {hasDivergence && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                    <span className={`font-medium ${
                      difference > 0 ? 'text-destructive' : 
                      difference < 0 ? 'text-primary' : 'text-green-600 dark:text-green-400'
                    }`}>
                      {difference > 0 ? '+' : ''}{difference}
                    </span>
                  </div>
                </div>
              )}
              
              {countedBy && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>Contado por: {countedBy}</span>
                </div>
              )}
              
              {countedAt && (
                <div className="text-xs text-muted-foreground">
                  {new Date(countedAt).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              disabled={isDisabled}
              className="w-full"
            >
              Editar Contagem
            </Button>
          </>
        ) : isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Quantidade:</label>
              <Input
                type="number"
                min="0"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="Digite a quantidade contada"
                className="mt-1"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleSave}
                disabled={updateCountMutation.isPending}
                className="flex-1"
              >
                {updateCountMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancel}
                disabled={updateCountMutation.isPending}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Quantidade:</label>
              <Input
                type="number"
                min="0"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="Digite a quantidade contada"
                disabled={isDisabled}
                className="mt-1"
              />
            </div>
            
            <Button 
              onClick={handleSave}
              disabled={isDisabled || updateCountMutation.isPending || !count}
              className="w-full"
            >
              {updateCountMutation.isPending ? "Registrando..." : "Registrar Contagem"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}