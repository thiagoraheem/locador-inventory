import { inventoryRepository } from '../repositories/inventory.repository';
import { productRepository } from '../repositories/product.repository';
import { locationRepository } from '../repositories/location.repository';
import { stockRepository } from '../repositories/stock.repository';

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
    console.log('DEBUG: InventoryService.createInventory - dados recebidos:', JSON.stringify(data, null, 2));
    
    // Validate Rotativo inventory requirements
    if (data.typeId) {
      const types = await this.getInventoryTypes();
      const inventoryType = types.find((t: any) => t.id === data.typeId);
      
      console.log('DEBUG: Tipo de inventário encontrado:', inventoryType);
      
      if (inventoryType?.name === 'Rotativo') {
        console.log('DEBUG: Validando inventário Rotativo');
        console.log('DEBUG: selectedProductIds:', data.selectedProductIds);
        console.log('DEBUG: selectedCategoryIds:', data.selectedCategoryIds);
        
        if (!data.selectedProductIds || data.selectedProductIds.length === 0) {
          console.log('ERROR: Produtos não selecionados para inventário Rotativo');
          throw new Error('Produtos devem ser selecionados para inventário do tipo Rotativo');
        }
        if (!data.selectedCategoryIds || data.selectedCategoryIds.length === 0) {
          console.log('ERROR: Categorias não selecionadas para inventário Rotativo');
          throw new Error('Categorias devem ser selecionadas para inventário do tipo Rotativo');
        }
        
        console.log('DEBUG: Validação Rotativo passou - produtos e categorias selecionados');
      }
    }

    const inventory = await inventoryRepository.create(data);
    
    console.log('DEBUG: Inventário criado:', inventory);

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

    // Get locations (use selected ones or all active)
    const allLocations = await storage.getLocations();
    const locations = selectedLocationIds && selectedLocationIds.length > 0
      ? allLocations.filter((l: any) => selectedLocationIds.includes(l.id) && l.isActive)
      : allLocations.filter((l: any) => l.isActive);

    // Create inventory items only for selected products
    for (const product of selectedProducts) {
      for (const location of locations) {
        // Get current stock for this product-location combination
        const stockItems = await storage.getStock(product.id, location.id);
        const expectedQuantity = stockItems.reduce((sum: number, stock: any) => sum + (stock.quantity || 0), 0);

        // Create inventory item
        await storage.createInventoryItem({
          inventoryId,
          productId: product.id,
          locationId: location.id,
          expectedQuantity,
          status: 'PENDING'
        });
      }
    }
  }
}

export const inventoryService = new InventoryService();
