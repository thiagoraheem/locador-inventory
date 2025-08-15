import type { Express } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { productController } from "../controllers/product.controller";

export function registerProductRoutes(app: Express) {

  // List all products
  app.get("/api/products", isAuthenticated, productController.list);

  // Search products
  app.get("/api/products/search", isAuthenticated, productController.search);

  // Get product by id
  app.get("/api/products/:id", isAuthenticated, productController.get);

  // Get products with serial control information
  app.get(
    "/api/products/with-serial-control",
    isAuthenticated,
    productController.withSerialControl,
  );

  // Buscar produto por n\u00famero de s\u00e9rie
  app.get(
    "/api/products/by-serial/:serial",
    isAuthenticated,
    productController.findBySerial,
  );
}

