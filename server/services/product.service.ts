import { getStorage } from "../db";

export class ProductService {
  async getProducts() {
    const storage = await getStorage();
    return storage.getProducts();
  }

  async searchProducts(query: string, limit: number) {
    const storage = await getStorage();
    return storage.searchProducts(query, limit);
  }

  async getProduct(id: number) {
    const storage = await getStorage();
    return storage.getProduct(id);
  }

  async getProductsWithSerialControl() {
    const storage = await getStorage();
    if (typeof storage.getProductsWithSerialControl === "function") {
      return storage.getProductsWithSerialControl();
    }
    const products = await storage.getProducts();
    return products.map((product: any) => ({
      ...product,
      hasSerialControl: false,
    }));
  }

  async findProductBySerial(serial: string) {
    const storage = await getStorage();
    return storage.findProductBySerial(serial);
  }
}

export const productService = new ProductService();
