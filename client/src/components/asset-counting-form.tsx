import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Package, MapPin, DollarSign, Hash, Barcode, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { InventoryStockItem, StockItem } from "@shared/schema";

interface AssetCountingFormProps {
  inventoryStockItem: InventoryStockItem;
  stockItemDetails?: StockItem;
  onClose: () => void;
  onCountUpdate: () => void;
}

export default function AssetCountingForm({
  inventoryStockItem,
  stockItemDetails,
  onClose,
  onCountUpdate
}: AssetCountingFormProps) {
  const [countType, setCountType] = useState<'count1' | 'count2' | 'count3' | 'count4'>('count1');
  const [status, setStatus] = useState<'present' | 'absent'>('present');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateCountMutation = useMutation({
    mutationFn: async (data: { count: number; countType: string }) => {
      const response = await fetch(`/api/inventory-stock-items/${inventoryStockItem.id}/count`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update asset count');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contagem registrada",
        description: "Contagem do ativo registrada com sucesso",
      });
      onCountUpdate();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro ao registrar contagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    const countValue = status === 'present' ? 1 : 0;
    updateCountMutation.mutate({
      count: countValue,
      countType
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getAvailableCountTypes = () => {
    const types = [];
    if (!inventoryStockItem.count1) types.push({ value: 'count1', label: '1ª Contagem' });
    if (inventoryStockItem.count1 && !inventoryStockItem.count2) types.push({ value: 'count2', label: '2ª Contagem' });
    if (inventoryStockItem.count2 && !inventoryStockItem.count3) types.push({ value: 'count3', label: '3ª Contagem' });
    if (inventoryStockItem.count3 && !inventoryStockItem.count4) types.push({ value: 'count4', label: 'Auditoria' });
    return types;
  };

  const availableCountTypes = getAvailableCountTypes();

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Contagem de Ativo</DialogTitle>
          <DialogDescription>
            Registre a presença ou ausência deste ativo patrimonial
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Asset Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Detalhes do Ativo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Barcode className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Etiqueta:</span>
                    <span className="font-mono">{stockItemDetails?.assetTag || '-'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Nº Série:</span>
                    <span className="font-mono">{stockItemDetails?.serialNumber || '-'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Local:</span>
                    <span>{stockItemDetails?.location || '-'}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Descrição:</span>
                    <p className="text-sm text-muted-foreground">
                      {stockItemDetails?.description || '-'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Valor:</span>
                    <span className="font-bold">
                      {stockItemDetails?.currentValue ? 
                        formatCurrency(stockItemDetails.currentValue) : '-'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Condição:</span>
                    <Badge variant="outline">
                      {stockItemDetails?.condition || 'N/A'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Count Type Selection */}
          {availableCountTypes.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tipo de Contagem</CardTitle>
                <CardDescription>
                  Selecione o tipo de contagem que deseja registrar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={countType} 
                  onValueChange={(value) => setCountType(value as any)}
                  className="grid grid-cols-2 gap-4"
                >
                  {availableCountTypes.map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={type.value} id={type.value} />
                      <Label htmlFor={type.value}>{type.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {/* Status Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status do Ativo</CardTitle>
              <CardDescription>
                O ativo foi encontrado no local esperado?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup 
                value={status} 
                onValueChange={(value) => setStatus(value as 'present' | 'absent')}
                className="space-y-4"
              >
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent">
                  <RadioGroupItem value="present" id="present" />
                  <Label htmlFor="present" className="flex items-center gap-2 cursor-pointer">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Presente</div>
                      <div className="text-sm text-muted-foreground">
                        O ativo foi encontrado no local indicado
                      </div>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent">
                  <RadioGroupItem value="absent" id="absent" />
                  <Label htmlFor="absent" className="flex items-center gap-2 cursor-pointer">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <div className="font-medium">Ausente</div>
                      <div className="text-sm text-muted-foreground">
                        O ativo não foi encontrado no local indicado
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Observações</CardTitle>
              <CardDescription>
                Adicione observações sobre a contagem (opcional)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ex: Ativo encontrado em local diferente, danos observados, etc..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Previous Counts */}
          {(inventoryStockItem.count1 !== undefined || 
            inventoryStockItem.count2 !== undefined || 
            inventoryStockItem.count3 !== undefined || 
            inventoryStockItem.count4 !== undefined) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contagens Anteriores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {inventoryStockItem.count1 !== undefined && (
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">1ª Contagem</div>
                      <div className="font-bold">
                        {inventoryStockItem.count1 ? 'Presente' : 'Ausente'}
                      </div>
                      {inventoryStockItem.count1By && (
                        <div className="text-xs text-muted-foreground">
                          {inventoryStockItem.count1By}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {inventoryStockItem.count2 !== undefined && (
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">2ª Contagem</div>
                      <div className="font-bold">
                        {inventoryStockItem.count2 ? 'Presente' : 'Ausente'}
                      </div>
                      {inventoryStockItem.count2By && (
                        <div className="text-xs text-muted-foreground">
                          {inventoryStockItem.count2By}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {inventoryStockItem.count3 !== undefined && (
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">3ª Contagem</div>
                      <div className="font-bold">
                        {inventoryStockItem.count3 ? 'Presente' : 'Ausente'}
                      </div>
                      {inventoryStockItem.count3By && (
                        <div className="text-xs text-muted-foreground">
                          {inventoryStockItem.count3By}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {inventoryStockItem.count4 !== undefined && (
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Auditoria</div>
                      <div className="font-bold">
                        {inventoryStockItem.count4 ? 'Presente' : 'Ausente'}
                      </div>
                      {inventoryStockItem.count4By && (
                        <div className="text-xs text-muted-foreground">
                          {inventoryStockItem.count4By}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={updateCountMutation.isPending}
            >
              {updateCountMutation.isPending ? "Registrando..." : "Registrar Contagem"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}