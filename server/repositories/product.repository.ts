// @ts-nocheck
import { BaseRepository } from "./base.repository";

export interface Product {
  id: number;
  [key: string]: any;
}

export class ProductRepository extends BaseRepository<Product> {
  async findAll(search?: string, limit?: number, offset?: number, includeInactive?: boolean): Promise<Product[]> {
    const storage = await this.getStorage();
    return storage.getProducts(search, limit, offset, includeInactive);
  }

  async findById(id: string): Promise<Product | null> {
    const storage = await this.getStorage();
    return storage.getProduct(Number(id));
  }

  async create(data: Partial<Product>): Promise<Product> {
    const storage = await this.getStorage();
    return storage.createProduct(data as any);
  }

  async update(id: string, data: Partial<Product>): Promise<Product | null> {
    const storage = await this.getStorage();
    return storage.updateProduct(Number(id), data as any);
  }

  async delete(id: string): Promise<boolean> {
    const storage = await this.getStorage();
    await storage.deleteProduct(Number(id));
    return true;
  }

  async search(query: string, limit: number) {
    const storage = await this.getStorage();
    return storage.searchProducts(query, limit);
  }

  async findWithSerialControl() {
    const storage = await this.getStorage();
    if (typeof storage.getProductsWithSerialControl === "function") {
      return storage.getProductsWithSerialControl();
    }
    const products = await storage.getProducts();
    return products.map((product: any) => ({
      ...product,
      hasSerialControl: false,
    }));
  }

  async findBySerial(serial: string) {
    const storage = await this.getStorage();
    return storage.findProductBySerial(serial);
  }

  async findByCategories(categoryIds: number[]) {
    const storage = await this.getStorage();
    return storage.getProductsByCategories(categoryIds);
  }
}

export const productRepository = new ProductRepository();
