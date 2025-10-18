import { inventoryRepository } from '../repositories/inventory.repository';
import { productRepository } from '../repositories/product.repository';
import { locationRepository } from '../repositories/location.repository';
import { stockRepository } from '../repositories/stock.repository';
import { logger } from "../utils/logger";

export class InventoryService {
  async getInventoryTypes() {
    return inventoryRepository.getTypes();
  }

  async getInventories() {
    return inventoryRepository.findAll();
  }

  async getInventory(id: string) {
    return inventoryRepository.findById(id);
  }

  async createInventory(data: any) {
    logger.debug('InventoryService.createInventory - dados recebidos:', JSON.stringify(data, null, 2));
    
    // Validate Rotativo inventory requirements
    if (data.typeId) {
      const types = await this.getInventoryTypes();
      const inventoryType = types.find((t: any) => t.id === data.typeId);
      
      logger.debug('Tipo de inventário encontrado:', inventoryType);
      
      if (inventoryType?.name === 'Rotativo') {
        logger.debug('Validando inventário Rotativo');
        logger.debug('selectedProductIds:', data.selectedProductIds);
        logger.debug('selectedCategoryIds:', data.selectedCategoryIds);
        
        if (!data.selectedProductIds || data.selectedProductIds.length === 0) {
          logger.error('Produtos não selecionados para inventário Rotativo');
          throw new Error('Produtos devem ser selecionados para inventário do tipo Rotativo');
        }
        if (!data.selectedCategoryIds || data.selectedCategoryIds.length === 0) {
          logger.error('Categorias não selecionadas para inventário Rotativo');
          throw new Error('Categorias devem ser selecionadas para inventário do tipo Rotativo');
        }
        
        logger.debug('Validação Rotativo passou - produtos e categorias selecionados');
      }
    }

    const inventory = await inventoryRepository.create(data);
    
    logger.debug('Inventário criado:', inventory);

    // Generate inventory items based on type
    if (data.typeId) {
      const types = await this.getInventoryTypes();
      const inventoryType = types.find((t: any) => t.id === data.typeId);
      
      if (inventoryType?.name === 'Rotativo') {
        await this.generateRotativeInventoryItems(inventory.id, data.selectedProductIds, data.selectedLocationIds);
      }
    }
    
    return inventory;
  }

  /**
   * Generates inventory items for Rotativo inventory type
   * Only creates items for specifically selected products
   */
  async generateRotativeInventoryItems(inventoryId: number, selectedProductIds: number[], selectedLocationIds?: number[]) {
    if (!selectedProductIds || selectedProductIds.length === 0) {
      throw new Error('Produtos devem ser especificados para inventário rotativo');
    }

    const storage = await inventoryRepository.getStorage();
    
    // Get selected products
    const allProducts = await storage.getProducts();
    const selectedProducts = allProducts.filter((p: any) => 
      selectedProductIds.includes(p.id) && p.isActive
    );

    logger.debug('Produtos selecionados para inventário rotativo:', selectedProducts.map(p => ({ id: p.id, sku: p.sku, name: p.name })));

    // Get locations (use selected ones or all active)
    const allLocations = await storage.getLocations();
    const locations = selectedLocationIds && selectedLocationIds.length > 0
      ? allLocations.filter((l: any) => selectedLocationIds.includes(l.id) && l.isActive)
      : allLocations.filter((l: any) => l.isActive);

    logger.debug('Locais selecionados:', locations.map(l => ({ id: l.id, name: l.name })));

    // Create inventory items only for selected products
    for (const product of selectedProducts) {
      logger.debug(`Processando produto ${product.sku} - ${product.name} (ID: ${product.id})`);
      
      for (const location of locations) {
        logger.debug(`Verificando estoque no local ${location.name} (ID: ${location.id})`);
        
        // Get current stock for this product-location combination
        const stockItems = await storage.getStock(product.id, location.id);
        
        logger.debug(`Itens de estoque encontrados:`, stockItems.map(s => ({
          id: s.id,
          productId: s.productId,
          locationId: s.locationId,
          quantity: s.quantity,
          quantityType: typeof s.quantity,
          quantityAsNumber: Number(s.quantity)
        })));
        
        const expectedQuantity = stockItems.reduce((sum: number, stock: any) => {
          const qty = Number(stock.quantity) || 0;
          logger.debug(`Somando quantidade ${stock.quantity} (tipo: ${typeof stock.quantity}) -> ${qty}`);
          return sum + qty;
        }, 0);

        logger.debug(`Quantidade esperada calculada: ${expectedQuantity}`);

        // Create inventory item
        await storage.createInventoryItem({
          inventoryId,
          productId: product.id,
          locationId: location.id,
          expectedQuantity,
          status: 'PENDING'
        });

        logger.debug(`Item de inventário criado com quantidade esperada: ${expectedQuantity}`);
      }
    }
  }
}

export const inventoryService = new InventoryService();
