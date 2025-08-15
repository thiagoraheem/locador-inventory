import { inventoryRepository } from "../repositories/inventory.repository";

export class InventoryService {
  async getInventoryTypes() {
    return inventoryRepository.getTypes();
  }

  async getInventories() {
    return inventoryRepository.findAll();
  }

  async getInventory(id: number) {
    return inventoryRepository.findById(String(id));
  }

  async createInventory(data: any) {
    return inventoryRepository.create(data);
  }
}

export const inventoryService = new InventoryService();
