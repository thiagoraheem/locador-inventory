import { Request, Response, NextFunction } from "express";
import { productService } from "../services/product.service";

export class ProductController {
  list = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const products = await productService.getProducts();
      res.json(products);
    } catch (error) {
      next(error);
    }
  };

  search = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q = "", limit = 20 } = req.query as any;
      const products = await productService.searchProducts(
        q.toString().trim(),
        parseInt(limit.toString(), 10),
      );
      res.json(products);
    } catch (error) {
      next(error);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      const product = await productService.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      next(error);
    }
  };

  withSerialControl = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const products = await productService.getProductsWithSerialControl();
      res.json(products);
    } catch (error) {
      next(error);
    }
  };

  findBySerial = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const serialNumber = req.params.serial;
      const product = await productService.findProductBySerial(serialNumber);
      if (!product) {
        return res.status(404).json({
          message: "Product not found for this serial number",
        });
      }
      res.json(product);
    } catch (error) {
      next(error);
    }
  };
}

export const productController = new ProductController();
