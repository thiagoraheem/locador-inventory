import { getStorage } from "../db";

export class InventoryService {
  async getInventoryTypes() {
    const storage = await getStorage();
    return storage.getInventoryTypes();
  }

  async getInventories() {
    const storage = await getStorage();
    return storage.getInventories();
  }

  async getInventory(id: number) {
    const storage = await getStorage();
    return storage.getInventory(id);
  }

  async createInventory(data: any) {
    const storage = await getStorage();
    return storage.createInventory(data);
  }
}

export const inventoryService = new InventoryService();
