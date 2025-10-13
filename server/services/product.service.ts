import { productRepository } from "../repositories/product.repository";

export class ProductService {
  async getProducts() {
    return productRepository.findAll();
  }

  async searchProducts(query: string, limit: number) {
    return productRepository.search(query, limit);
  }

  async getProduct(id: number) {
    return productRepository.findById(String(id));
  }

  async getProductsWithSerialControl() {
    return productRepository.findWithSerialControl();
  }

  async findProductBySerial(serial: string) {
    return productRepository.findBySerial(serial);
  }

  async getProductsByCategories(categoryIds: number[]) {
    return productRepository.findByCategories(categoryIds);
  }
}

export const productService = new ProductService();
