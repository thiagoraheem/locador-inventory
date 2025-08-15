// APIs de integração e testes implementadas separadamente para evitar conflitos
// @ts-nocheck
import express from 'express';
import { SimpleStorage } from './simple-storage';
import { auditRepository } from './repositories/audit.repository';

export function addIntegrationRoutes(app: express.Application, getStorage: () => Promise<SimpleStorage>, isAuthenticated: any) {
  
  // ===== ROTAS DE TESTES E INTEGRAÇÃO =====

  // Executar cenários de teste
  app.post("/api/test/serial-control-flow", isAuthenticated, async (req: any, res) => {
    try {
      const { InventoryTestScenarios } = await import('./test-scenarios');
      const storage = await getStorage();
      const testRunner = new InventoryTestScenarios(storage);
      
      const result = await testRunner.testSerialControlFlow();
      res.json(result);
    } catch (error) {
      console.error("Error running serial control test:", error);
      res.status(500).json({ message: "Failed to run serial control test" });
    }
  });

  // Executar teste de quantidade manual
  app.post("/api/test/manual-quantity-flow", isAuthenticated, async (req: any, res) => {
    try {
      const { InventoryTestScenarios } = await import('./test-scenarios');
      const storage = await getStorage();
      const testRunner = new InventoryTestScenarios(storage);
      
      const result = await testRunner.testManualQuantityFlow();
      res.json(result);
    } catch (error) {
      console.error("Error running manual quantity test:", error);
      res.status(500).json({ message: "Failed to run manual quantity test" });
    }
  });

  // Executar teste de discrepâncias
  app.post("/api/test/discrepancy-handling", isAuthenticated, async (req: any, res) => {
    try {
      const { InventoryTestScenarios } = await import('./test-scenarios');
      const storage = await getStorage();
      const testRunner = new InventoryTestScenarios(storage);
      
      const result = await testRunner.testDiscrepancyHandling();
      res.json(result);
    } catch (error) {
      console.error("Error running discrepancy test:", error);
      res.status(500).json({ message: "Failed to run discrepancy test" });
    }
  });

  // Executar teste de performance
  app.post("/api/test/large-volume-performance", isAuthenticated, async (req: any, res) => {
    try {
      const { InventoryTestScenarios } = await import('./test-scenarios');
      const storage = await getStorage();
      const testRunner = new InventoryTestScenarios(storage);
      
      const result = await testRunner.testLargeVolumePerformance();
      res.json(result);
    } catch (error) {
      console.error("Error running performance test:", error);
      res.status(500).json({ message: "Failed to run performance test" });
    }
  });

  // Buscar produto por SKU (versão melhorada)
  app.get("/api/products/sku/:sku", isAuthenticated, async (req: any, res) => {
    try {
      const sku = req.params.sku;
      const storage = await getStorage();
      const product = await storage.searchProductBySKU(sku);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error searching product by SKU:", error);
      res.status(500).json({ message: "Failed to search product" });
    }
  });

  // Registrar contagem manual para produto sem série
  app.post("/api/inventories/:id/manual-count", isAuthenticated, async (req: any, res) => {
    try {
      const inventoryId = parseInt(req.params.id);
      const { productId, locationId, quantity, countStage, confirmAdd = false } = req.body;
      

      
      const storage = await getStorage();
      
      // Buscar item do inventário
      const items = await storage.getInventoryItemsWithDetails(inventoryId);
      const item = items.find(i => i.productId === productId && i.locationId === locationId);
      
      if (!item) {
        // Se o item não existe e confirmAdd é false, retornar aviso
        if (!confirmAdd) {
          return res.status(404).json({ 
            code: "ITEM_NOT_FOUND",
            message: "Produto não encontrado neste inventário/estoque",
            productId,
            locationId,
            needsConfirmation: true
          });
        }
        
        // Se confirmAdd é true, criar novo item no inventário
        try {
          // Verificar se o produto existe no sistema
          const products = await storage.getProducts();
          const product = products.find(p => p.id === productId);
          if (!product) {
            return res.status(400).json({ 
              message: "Produto não encontrado no sistema" 
            });
          }

          // Verificar se a localização existe
          const locations = await storage.getLocations();
          const location = locations.find(l => l.id === locationId);
          if (!location) {
            return res.status(400).json({ 
              message: "Local de estoque não encontrado" 
            });
          }

          // Preparar dados para criação do item
          const itemData: any = {
            inventoryId,
            productId,
            locationId,
            expectedQuantity: 0,
            status: 'pending'
          };

          // Adicionar contagem baseada no estágio
          itemData[`count${countStage}`] = quantity;
          itemData[`count${countStage}By`] = req.user?.id;
          itemData[`count${countStage}At`] = Date.now();

          // Criar novo item no inventário
          const newItem = await storage.createInventoryItem(itemData);

          await storage.createAuditLog({
            userId: req.user?.id || 0,
            action: "CREATE_INVENTORY_ITEM",
            entityType: "inventory_item",
            entityId: newItem.id.toString(),
            oldValues: "",
            newValues: JSON.stringify({
              inventoryId,
              productId,
              locationId,
              [`count${countStage}`]: quantity,
              added: true
            }),
            metadata: ""
          });

          return res.json({ 
            message: "Produto adicionado ao inventário com sucesso",
            itemId: newItem.id,
            quantity,
            countStage,
            added: true
          });
        } catch (error) {
          console.error("Error creating inventory item:", error);
          return res.status(500).json({ 
            message: "Falha ao adicionar produto ao inventário" 
          });
        }
      }
      
      // Item existe, atualizar contagem baseada no estágio
      try {
        let result;
        const userId = req.user?.id || 0;

        // Chamar o método correto baseado no estágio de contagem
        switch (countStage) {
          case '1':
            result = await storage.updateCount1(item.id, quantity, userId);
            break;
          case '2':
            result = await storage.updateCount2(item.id, quantity, String(userId));
            break;
          case '3':
            result = await storage.updateCount3(item.id, quantity, String(userId));
            break;
          case '4':
            result = await storage.updateCount4(item.id, quantity, userId);
            break;
          default:
            throw new Error(`Estágio de contagem inválido: ${countStage}`);
        }

        await storage.createAuditLog({
          userId: userId,
          action: `UPDATE_COUNT${countStage}`,
          entityType: "inventory_item",
          entityId: item.id.toString(),
          oldValues: "",
          newValues: JSON.stringify({
            [`count${countStage}`]: quantity,
            countedBy: userId,
            countedAt: Date.now()
          }),
          metadata: ""
        });
        
        res.json({ 
          message: "Contagem registrada com sucesso",
          itemId: item.id,
          quantity,
          countStage,
          updated: true
        });
      } catch (error) {
        console.error("Error updating inventory count:", error);
        res.status(500).json({ 
          message: "Falha ao atualizar contagem no inventário" 
        });
      }
    } catch (error) {
      console.error("Error registering manual count:", error);
      res.status(500).json({ message: "Failed to register manual count" });
    }
  });

  // Obter estatísticas detalhadas de patrimônio
  app.get("/api/inventories/:id/patrimonio-stats", isAuthenticated, async (req: any, res) => {
    try {
      const inventoryId = parseInt(req.params.id);
      const storage = await getStorage();
      
      // Simulação de estatísticas de patrimônio
      const stats = {
        totalSerialItems: 0,
        serialItemsFound: 0,
        serialItemsMissing: 0,
        serialItemsExtra: 0,
        productsWithSerial: 0,
        productsWithDiscrepancy: 0,
        accuracy: 0
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching patrimonio stats:", error);
      res.status(500).json({ message: "Failed to fetch patrimonio stats" });
    }
  });

  // Gerar relatório de auditoria completo
  app.get("/api/inventories/:id/audit-report", isAuthenticated, async (req: any, res) => {
    try {
      const inventoryId = parseInt(req.params.id);
      const auditLogs = await auditRepository.findAll(1000, 0);
      const inventoryLogs = auditLogs.filter(log => 
        log.entityType === 'inventory' && log.entityId === inventoryId.toString() ||
        log.entityType === 'inventory_item' && log.metadata?.includes(`"inventoryId":${inventoryId}`) ||
        log.entityType === 'inventory_serial_item' && log.entityId.startsWith(`${inventoryId}-`)
      );
      
      const report = {
        inventoryId,
        generatedAt: Date.now(),
        totalOperations: inventoryLogs.length,
        operationsByType: inventoryLogs.reduce((acc: any, log) => {
          acc[log.action] = (acc[log.action] || 0) + 1;
          return acc;
        }, {}),
        timeline: inventoryLogs.map(log => ({
          timestamp: log.timestamp,
          action: log.action,
          user: log.userId,
          details: log.metadata || log.newValues
        })).sort((a, b) => b.timestamp - a.timestamp),
        users: [...new Set(inventoryLogs.map(log => log.userId))]
      };
      
      res.json(report);
    } catch (error) {
      console.error("Error generating audit report:", error);
      res.status(500).json({ message: "Failed to generate audit report" });
    }
  });

  // Exportar dados do inventário para CSV
  app.get("/api/inventories/:id/export", isAuthenticated, async (req: any, res) => {
    try {
      const inventoryId = parseInt(req.params.id);
      const format = req.query.format || 'json';
      const storage = await getStorage();
      
      const inventory = await storage.getInventory(inventoryId);
      const items = await storage.getInventoryItems(inventoryId);
      
      if (format === 'csv') {
        const csvData = [
          'ProductSKU,ProductName,Location,ExpectedQty,Count1,Count2,Count3,Status',
          ...items.map(item => 
            `"${item.product?.sku || ''}", "${item.product?.name || ''}", "${item.location?.name || ''}", ${item.expectedQuantity}, ${item.count1 || ''}, ${item.count2 || ''}, ${item.count3 || ''}, "${item.status}"`
          )
        ].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="inventory-${inventoryId}-export.csv"`);
        res.send(csvData);
      } else {
        res.json({
          inventory,
          items,
          exportedAt: Date.now()
        });
      }
    } catch (error) {
      console.error("Error exporting inventory data:", error);
      res.status(500).json({ message: "Failed to export inventory data" });
    }
  });

  // ===== ENDPOINTS ERP INTEGRATION =====

  // Endpoint individual para atualizar estoque no ERP
  app.post("/api/Estoque/atualizar", isAuthenticated, async (req: any, res) => {
    try {
      const { ERPIntegrationService } = await import('./services/erp-integration.service');
      const storage = await getStorage();
      const erpService = new ERPIntegrationService(storage);
      
      const { erpStockUpdateRequestSchema } = await import('../shared/schema');
      const requestData = erpStockUpdateRequestSchema.parse(req.body);
      
      const result = await erpService.updateStock(requestData);
      
      if (result) {
        res.json({ 
          success: true, 
          message: "Estoque atualizado com sucesso no ERP" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Falha ao atualizar estoque no ERP" 
        });
      }
    } catch (error) {
      console.error("Error updating ERP stock:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro interno ao atualizar estoque" 
      });
    }
  });

  // Endpoint para atualizar lista de itens no estoque ERP
  app.post("/api/Estoque/atualizar-lista", isAuthenticated, async (req: any, res) => {
    try {
      const { ERPIntegrationService } = await import('./services/erp-integration.service');
      const storage = await getStorage();
      const erpService = new ERPIntegrationService(storage);
      
      const { z } = await import('zod');
      const { erpStockUpdateRequestSchema } = await import('../shared/schema');
      
      // Aceitar tanto 'items' quanto 'itens'
      const requestData = req.body;
      const items = requestData.items || requestData.itens;
      
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({
          success: false,
          message: "Campo 'items' ou 'itens' é obrigatório e deve ser um array"
        });
      }
      
      // Validar cada item individualmente
      const validatedItems = items.map((item: any) => erpStockUpdateRequestSchema.parse(item));
      
      const result = await erpService.updateStockList(validatedItems);
      
      if (result) {
        res.json({ 
          success: true, 
          message: `${validatedItems.length} itens atualizados com sucesso no ERP`,
          processedItems: validatedItems.length
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Falha ao atualizar lista de estoque no ERP" 
        });
      }
    } catch (error) {
      console.error("Error updating ERP stock list:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro interno ao atualizar lista de estoque" 
      });
    }
  });

  // Verificar status de migração ERP do inventário
  app.get("/api/inventories/:id/erp-status", isAuthenticated, async (req: any, res) => {
    try {
      const inventoryId = parseInt(req.params.id);
      const userId = req.user?.id || 0;
      
      const { ERPIntegrationService } = await import('./services/erp-integration.service');
      const storage = await getStorage();
      const erpService = new ERPIntegrationService(storage);
      
      const status = await erpService.validateInventoryForMigration(inventoryId, userId);
      res.json(status);
    } catch (error) {
      console.error("Error checking ERP status:", error);
      res.status(500).json({ 
        inventoryId: parseInt(req.params.id),
        canMigrate: false,
        reason: "Erro interno ao verificar status",
        itemsToMigrate: 0
      });
    }
  });

  // Migrar inventário completo para ERP
  app.post("/api/inventories/:id/migrate-to-erp", isAuthenticated, async (req: any, res) => {
    try {
      const inventoryId = parseInt(req.params.id);
      const userId = req.user?.id || 0;
      
      const { ERPIntegrationService } = await import('./services/erp-integration.service');
      const storage = await getStorage();
      const erpService = new ERPIntegrationService(storage);
      
      const result = await erpService.migrateInventoryToERP(inventoryId, userId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error migrating inventory to ERP:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro interno durante migração para ERP",
        migratedItems: 0
      });
    }
  });

  // Validar conexão com ERP
  app.get("/api/erp/validate-connection", isAuthenticated, async (req: any, res) => {
    try {
      const { ERPIntegrationService } = await import('./services/erp-integration.service');
      const storage = await getStorage();
      const erpService = new ERPIntegrationService(storage);
      
      const isConnected = await erpService.validateERPConnection();
      
      res.json({
        connected: isConnected,
        message: isConnected ? "Conexão ERP estabelecida" : "Falha na conexão ERP",
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Error validating ERP connection:", error);
      res.status(500).json({
        connected: false,
        message: "Erro ao validar conexão ERP",
        timestamp: Date.now()
      });
    }
  });

  // Endpoint para verificar e corrigir schema ERP
  app.post("/api/admin/fix-erp-schema", isAuthenticated, async (req: any, res) => {
    try {
      const storage = await getStorage();
      
      // Forçar verificação e correção das colunas ERP
      await storage.ensureERPColumns();
      
      res.json({
        success: true,
        message: "Schema ERP verificado e corrigido com sucesso"
      });
    } catch (error) {
      console.error("Error fixing ERP schema:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao corrigir schema ERP",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Congelar/descongelar estoque no ERP (endpoint /api/Estoque/congelar)
  app.patch("/api/Estoque/congelar", isAuthenticated, async (req: any, res) => {
    try {
      const { ERPIntegrationService } = await import('./services/erp-integration.service');
      const storage = await getStorage();
      const erpService = new ERPIntegrationService(storage);
      
      // Obter parâmetro freeze da query string
      const freeze = req.query.freeze === 'true';
      
      const result = await erpService.freezeStock(freeze);
      
      if (result) {
        res.json({ 
          success: true, 
          message: freeze ? "Estoque congelado com sucesso no ERP" : "Estoque descongelado com sucesso no ERP",
          frozen: freeze
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: freeze ? "Falha ao congelar estoque no ERP" : "Falha ao descongelar estoque no ERP"
        });
      }
    } catch (error) {
      console.error("Error freezing/unfreezing ERP stock:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro interno ao congelar/descongelar estoque" 
      });
    }
  });
}