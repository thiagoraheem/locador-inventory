import type { Express } from "express";
import { isAuthenticated } from "../auth";
import { productService } from "../services/product.service";

export function registerProductRoutes(app: Express) {

  // List all products
  app.get("/api/products", isAuthenticated, async (req, res) => {
    try {
      const products = await productService.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error as Error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Search products
  app.get("/api/products/search", isAuthenticated, async (req: any, res) => {
    try {
      const { q = "", limit = 20 } = req.query;
      const products = await productService.searchProducts(
        q.trim(),
        parseInt(limit.toString()),
      );
      res.json(products);
    } catch (error) {
      console.error("\u274c Error searching products:", error);
      res.status(500).json({
        message: "Failed to search products",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get product by id
  app.get("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await productService.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error as Error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Get products with serial control information
  app.get(
    "/api/products/with-serial-control",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const products = await productService.getProductsWithSerialControl();
        res.json(products);
      } catch (error) {
        console.error("\u274c Error fetching products with serial control:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch products with serial control" });
      }
    },
  );

  // Buscar produto por n\u00famero de s\u00e9rie
  app.get(
    "/api/products/by-serial/:serial",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const serialNumber = req.params.serial;
        const product = await productService.findProductBySerial(serialNumber);

        if (!product) {
          return res
            .status(404)
            .json({ message: "Product not found for this serial number" });
        }

        res.json(product);
      } catch (error) {
        console.error("Error finding product by serial:", error);
        res.status(500).json({ message: "Failed to find product" });
      }
    },
  );
}

