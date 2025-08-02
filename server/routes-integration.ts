// APIs de integração e testes implementadas separadamente para evitar conflitos
import express from 'express';
import { SimpleStorage } from './simple-storage';

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
      const storage = await getStorage();
      
      // Buscar logs de auditoria relacionados ao inventário
      const auditLogs = await storage.getAuditLogs();
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
}