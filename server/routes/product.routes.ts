import type { Express } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { productController } from "../controllers/product.controller";

export function registerProductRoutes(app: Express) {

  // List all products
  app.get("/api/products", isAuthenticated, productController.list);

  // Search products
  app.get("/api/products/search", isAuthenticated, productController.search);

  // Get products with serial control information
  app.get(
    "/api/products/with-serial-control",
    isAuthenticated,
    productController.withSerialControl,
  );

  // Get products by categories
  app.get(
    "/api/products/by-categories",
    isAuthenticated,
    productController.getByCategory,
  );

  // Buscar produto por número de série
  app.get(
    "/api/products/by-serial/:serial",
    isAuthenticated,
    productController.findBySerial,
  );

  // Get product by id (must be last to avoid conflicts)
  app.get("/api/products/:id", isAuthenticated, productController.get);
}

