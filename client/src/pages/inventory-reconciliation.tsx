import { useState } from "react";
import { useParams } from "wouter";
import InventoryValidation from "@/components/inventory-validation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function InventoryReconciliationPage() {
  const { id } = useParams<{ id: string }>();
  const inventoryId = parseInt(id || "0");

  if (!inventoryId) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-600">ID do inventário inválido</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/inventories">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Reconciliação do Inventário #{inventoryId}</h1>
      </div>

      {/* Componente de Validação */}
      <InventoryValidation inventoryId={inventoryId} />
    </div>
  );
}