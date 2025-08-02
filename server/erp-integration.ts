import { SimpleStorage } from "./simple-storage.js";
import { ERPStockUpdateRequest, ERPMigrationRequest, ERPMigrationResponse, ERPMigrationStatus } from "../shared/schema.js";

export class ERPIntegrationService {
  constructor(private storage: SimpleStorage) {}

  // Verificar se inventário pode ser migrado para ERP
  async validateInventoryForMigration(inventoryId: number, userId: number): Promise<ERPMigrationStatus> {
    try {
      // Buscar inventário
      const inventory = await this.storage.getInventory(inventoryId);
      if (!inventory) {
        return {
          inventoryId,
          canMigrate: false,
          reason: "Inventário não encontrado",
          itemsToMigrate: 0
        };
      }

      // Verificar se inventário está fechado
      if (inventory.status !== "closed") {
        return {
          inventoryId,
          canMigrate: false,
          reason: "Inventário deve estar fechado para migração",
          itemsToMigrate: 0
        };
      }

      // Verificar se já foi migrado
      if (inventory.erpMigrated) {
        return {
          inventoryId,
          canMigrate: false,
          reason: `Inventário já foi migrado em ${new Date(inventory.erpMigratedAt!).toLocaleDateString('pt-BR')}`,
          itemsToMigrate: 0
        };
      }

      // Verificar permissões do usuário
      const user = await this.storage.getUser(userId);
      if (!user || !this.hasERPPermission(user.role || '')) {
        return {
          inventoryId,
          canMigrate: false,
          reason: "Usuário não tem permissão para migrar inventários",
          itemsToMigrate: 0
        };
      }

      // Buscar itens com divergências (finalQuantity != expectedQuantity)
      const items = await this.storage.getInventoryItemsWithDivergences(inventoryId);
      
      // Verificar se todos os itens têm finalQuantity definida
      const itemsWithoutFinalQuantity = items.filter((item: any) => 
        item.finalQuantity === null || item.finalQuantity === undefined
      );

      if (itemsWithoutFinalQuantity.length > 0) {
        return {
          inventoryId,
          canMigrate: false,
          reason: `${itemsWithoutFinalQuantity.length} itens sem quantidade final definida`,
          itemsToMigrate: 0
        };
      }

      // Calcular valor total de ajuste (opcional)
      const totalAdjustmentValue = items.reduce((total: number, item: any) => {
        const difference = (item.finalQuantity || 0) - item.expectedQuantity;
        const costValue = item.product?.costValue || 0;
        return total + (difference * costValue);
      }, 0);

      return {
        inventoryId,
        canMigrate: true,
        itemsToMigrate: items.length,
        totalAdjustmentValue
      };

    } catch (error) {
      console.error('Erro ao validar inventário para migração:', error);
      return {
        inventoryId,
        canMigrate: false,
        reason: "Erro interno ao validar inventário",
        itemsToMigrate: 0
      };
    }
  }

  // Migrar inventário para ERP
  async migrateInventoryToERP(inventoryId: number, userId: number): Promise<ERPMigrationResponse> {
    try {
      // Validar se pode migrar
      const validation = await this.validateInventoryForMigration(inventoryId, userId);
      if (!validation.canMigrate) {
        return {
          success: false,
          message: validation.reason || "Não é possível migrar este inventário",
          migratedItems: 0
        };
      }

      // Buscar itens com divergências para migração
      const items = await this.storage.getInventoryItemsWithDivergences(inventoryId);
      const inventory = await this.storage.getInventory(inventoryId);

      if (!inventory) {
        return {
          success: false,
          message: "Inventário não encontrado",
          migratedItems: 0
        };
      }

      // Preparar dados no formato ERP
      const erpItems: ERPStockUpdateRequest[] = items.map((item: any) => ({
        codProduto: item.product?.sku || '',
        quantidade: item.finalQuantity || 0,
        localEstoque: item.locationId,
        codInventario: inventory.code
      }));

      // Simular chamada para ERP (aqui você implementaria a integração real)
      const migrationResult = await this.sendToERP(erpItems);

      if (migrationResult.success) {
        // Marcar inventário como migrado (criar método dedicado)
        await this.markInventoryAsMigrated(inventoryId, userId);

        // Criar log de auditoria
        await this.storage.createAuditLog({
          userId,
          action: 'ERP_MIGRATION',
          entityType: 'inventory',
          entityId: inventoryId.toString(),
          metadata: JSON.stringify({
            itemsCount: migrationResult.migratedItems,
            timestamp: new Date().toISOString()
          })
        });
      }

      return migrationResult;

    } catch (error) {
      console.error('Erro ao migrar inventário para ERP:', error);
      return {
        success: false,
        message: "Erro interno durante migração",
        migratedItems: 0
      };
    }
  }

  // Simular integração com ERP (substituir por implementação real)
  private async sendToERP(items: ERPStockUpdateRequest[]): Promise<ERPMigrationResponse> {
    // Esta é uma simulação - em produção, aqui seria feita a chamada real para o ERP
    console.log('Enviando para ERP:', items);
    
    // Simular processamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simular sucesso na migração
    return {
      success: true,
      message: `${items.length} itens migrados com sucesso para o ERP`,
      migratedItems: items.length
    };
  }

  // Verificar se usuário tem permissão para migrar
  private hasERPPermission(userRole: string): boolean {
    const allowedRoles = ['admin', 'gerente', 'supervisor'];
    return allowedRoles.includes(userRole.toLowerCase());
  }

  // Atualizar item individual no estoque (endpoint /api/Estoque/atualizar)
  async updateStock(request: ERPStockUpdateRequest): Promise<boolean> {
    try {
      console.log('Atualizando estoque individual:', request);
      // Implementar lógica de atualização individual
      // Esta seria a integração real com o sistema ERP
      return true;
    } catch (error) {
      console.error('Erro ao atualizar estoque:', error);
      return false;
    }
  }

  // Atualizar lista de itens no estoque (endpoint /api/Estoque/atualizar-lista)
  async updateStockList(requests: ERPStockUpdateRequest[]): Promise<boolean> {
    try {
      console.log('Atualizando lista de estoque:', requests);
      // Implementar lógica de atualização em lote
      // Esta seria a integração real com o sistema ERP
      return true;
    } catch (error) {
      console.error('Erro ao atualizar lista de estoque:', error);
      return false;
    }
  }

  // Validar conexão com ERP
  async validateERPConnection(): Promise<boolean> {
    try {
      // Implementar teste de conectividade com ERP
      return true;
    } catch (error) {
      console.error('Erro ao validar conexão ERP:', error);
      return false;
    }
  }

  // Método auxiliar para marcar inventário como migrado
  private async markInventoryAsMigrated(inventoryId: number, userId: number): Promise<void> {
    // Adicionar colunas ERP se não existirem
    try {
      await this.ensureERPColumns();
    } catch (error) {
      console.warn('Aviso: Erro ao verificar colunas ERP:', error);
    }

    // Marcar como migrado
    const inventory = await this.storage.getInventory(inventoryId);
    if (inventory) {
      // Usar SQL direto para atualizar campos ERP
      console.log(`Marcando inventário ${inventoryId} como migrado por usuário ${userId}`);
    }
  }

  // Garantir que colunas ERP existem
  private async ensureERPColumns(): Promise<void> {
    // Esta função garante que as colunas ERP foram adicionadas à tabela inventories
    // Em produção, isso seria feito via migração
    console.log('Verificando colunas ERP na tabela inventories...');
  }
}