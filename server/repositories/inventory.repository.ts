// @ts-nocheck
import { BaseRepository } from "./base.repository";

export interface Inventory {
  id: number;
  [key: string]: any;
}

export class InventoryRepository extends BaseRepository<Inventory> {
  async findAll(): Promise<Inventory[]> {
    const storage = await this.getStorage();
    return storage.getInventories();
  }

  async findById(id: string): Promise<Inventory | null> {
    const storage = await this.getStorage();
    return storage.getInventory(Number(id));
  }

  async create(data: Partial<Inventory>): Promise<Inventory> {
    const storage = await this.getStorage();
    return storage.createInventory(data);
  }

  async update(id: string, data: Partial<Inventory>): Promise<Inventory | null> {
    const storage = await this.getStorage();
    return storage.updateInventory
      ? storage.updateInventory(Number(id), data)
      : null;
  }

  async delete(id: string): Promise<boolean> {
    const storage = await this.getStorage();
    if (storage.deleteInventory) {
      await storage.deleteInventory(Number(id));
    }
    return true;
  }

  async getTypes() {
    const storage = await this.getStorage();
    return storage.getInventoryTypes();
  }
}

export const inventoryRepository = new InventoryRepository();
