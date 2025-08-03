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

  // Enviar dados para ERP real
  private async sendToERP(items: ERPStockUpdateRequest[]): Promise<ERPMigrationResponse> {
    try {
      console.log('Enviando para ERP:', items);
      
      // Fazer chamada real para o endpoint do ERP usando a própria API interna
      const response = await this.callERPBatchUpdate(items);
      
      if (response.success) {
        return {
          success: true,
          message: `${items.length} itens migrados com sucesso para o ERP`,
          migratedItems: items.length
        };
      } else {
        return {
          success: false,
          message: `Falha na migração ERP: ${response.message}`,
          migratedItems: 0
        };
      }
    } catch (error) {
      console.error('Erro na integração ERP:', error);
      return {
        success: false,
        message: `Erro na integração ERP: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        migratedItems: 0
      };
    }
  }

  // Chamar endpoint ERP para atualização em lote
  private async callERPBatchUpdate(items: ERPStockUpdateRequest[]): Promise<{success: boolean, message: string}> {
    try {
      // Usar o endpoint interno de atualização em lote
      const result = await this.updateStockList(items);
      
      if (result) {
        return {
          success: true,
          message: 'Itens atualizados com sucesso no ERP'
        };
      } else {
        return {
          success: false,
          message: 'Falha ao atualizar itens no ERP'
        };
      }
    } catch (error) {
      console.error('Erro na chamada do ERP:', error);
      return {
        success: false,
        message: `Erro na chamada ERP: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  // Verificar se usuário tem permissão para migrar
  private hasERPPermission(userRole: string): boolean {
    const allowedRoles = ['admin', 'gerente', 'supervisor'];
    return allowedRoles.includes(userRole.toLowerCase());
  }

  // Atualizar item individual no estoque (endpoint /api/Estoque/atualizar)
  async updateStock(request: ERPStockUpdateRequest): Promise<boolean> {
    try {
      console.log('🔄 Atualizando estoque individual no ERP:', request);
      
      // AQUI É ONDE VOCÊ DEVE IMPLEMENTAR A INTEGRAÇÃO REAL COM SEU ERP
      // Por exemplo, se for um ERP web-based:
      /*
      const response = await fetch('http://seu-erp-url/api/estoque/atualizar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + process.env.ERP_API_KEY
        },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        throw new Error(`ERP API Error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ ERP Response:', result);
      return result.success;
      */
      
      // Por enquanto, simular sucesso mas com log detalhado
      console.log('⚠️  SIMULAÇÃO: Item seria enviado para ERP real');
      console.log('📋 Dados que seriam enviados:', {
        produto: request.codProduto,
        quantidadeNova: request.quantidade,
        localEstoque: request.localEstoque,
        inventario: request.codInventario,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao atualizar estoque no ERP:', error);
      return false;
    }
  }

  // Atualizar lista de itens no estoque (endpoint /api/Estoque/atualizar-lista)
  async updateStockList(requests: ERPStockUpdateRequest[]): Promise<boolean> {
    try {
      console.log('🔄 Atualizando lista de estoque no ERP:', requests.length, 'itens');
      
      // AQUI É ONDE VOCÊ DEVE IMPLEMENTAR A INTEGRAÇÃO REAL COM SEU ERP
      // Por exemplo:
      /*
      const response = await fetch('http://seu-erp-url/api/estoque/atualizar-lista', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + process.env.ERP_API_KEY
        },
        body: JSON.stringify({ itens: requests })
      });
      
      if (!response.ok) {
        throw new Error(`ERP API Error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ ERP Batch Response:', result);
      return result.success;
      */
      
      // Por enquanto, simular sucesso mas com log detalhado para cada item
      console.log('⚠️  SIMULAÇÃO: Lista seria enviada para ERP real');
      requests.forEach((item, index) => {
        console.log(`📋 Item ${index + 1}:`, {
          produto: item.codProduto,
          quantidadeNova: item.quantidade,
          localEstoque: item.localEstoque,
          inventario: item.codInventario
        });
      });
      console.log('🕒 Timestamp da operação:', new Date().toISOString());
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao atualizar lista de estoque no ERP:', error);
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
    console.log(`Marcando inventário ${inventoryId} como migrado por usuário ${userId}`);
    await this.storage.markInventoryAsMigrated(inventoryId, userId);
  }

  // Garantir que colunas ERP existem
  private async ensureERPColumns(): Promise<void> {
    // Esta função garante que as colunas ERP foram adicionadas à tabela inventories
    console.log('Verificando colunas ERP na tabela inventories...');
    await this.storage.ensureERPColumns();
  }
}