import { Request, Response } from "express";
import { productService } from "../services/product.service";
import { asyncHandler } from "../utils/async-handler";

export class ProductController {
  list = asyncHandler(async (_req: Request, res: Response) => {
    const products = await productService.getProducts();
    res.json(products);
  });

  search = asyncHandler(async (req: Request, res: Response) => {
    const { q = "", limit = 20 } = req.query as any;
    const products = await productService.searchProducts(
      q.toString().trim(),
      parseInt(limit.toString(), 10),
    );
    res.json(products);
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const product = await productService.getProduct(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  });

  withSerialControl = asyncHandler(async (_req: Request, res: Response) => {
    const products = await productService.getProductsWithSerialControl();
    res.json(products);
  });

  findBySerial = asyncHandler(async (req: Request, res: Response) => {
    const serialNumber = req.params.serial;
    const product = await productService.findProductBySerial(serialNumber);
    if (!product) {
      return res.status(404).json({
        message: "Product not found for this serial number",
      });
    }
    res.json(product);
  });
}

export const productController = new ProductController();
