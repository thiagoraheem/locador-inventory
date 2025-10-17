import { Request, Response } from "express";
import { productService } from "../services/product.service";
import { asyncHandler } from "../utils/async-handler";

export class ProductController {
  constructor(private service = productService) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const { search, includeInactive } = req.query as any;
    const products = await this.service.getProducts(
      search?.toString(),
      undefined, // limit
      undefined, // offset
      includeInactive === 'true'
    );
    res.json(products);
  });

  search = asyncHandler(async (req: Request, res: Response) => {
    const { q = "", limit = 20 } = req.query as any;
    const products = await this.service.searchProducts(
      q.toString().trim(),
      parseInt(limit.toString(), 10),
    );
    res.json(products);
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const product = await this.service.getProduct(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  });

  withSerialControl = asyncHandler(async (_req: Request, res: Response) => {
    const products = await this.service.getProductsWithSerialControl();
    res.json(products);
  });

  findBySerial = asyncHandler(async (req: Request, res: Response) => {
    const serialNumber = req.params.serial;
    const product = await this.service.findProductBySerial(serialNumber);
    if (!product) {
      return res.status(404).json({
        message: "Product not found for this serial number",
      });
    }
    res.json(product);
  });

  getByCategory = asyncHandler(async (req: Request, res: Response) => {
    const categoryIds = req.query.categoryIds as string;
    if (!categoryIds) {
      return res.status(400).json({ message: "Category IDs are required" });
    }
    
    const categoryIdArray = categoryIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    if (categoryIdArray.length === 0) {
      return res.status(400).json({ message: "Valid category IDs are required" });
    }
    
    console.log('Controller - Category IDs received:', categoryIdArray);
    const products = await this.service.getProductsByCategories(categoryIdArray);
    console.log('Controller - Products found:', products.length);
    
    if (products.length === 0) {
      return res.status(404).json({ message: "No products found for the specified categories" });
    }
    
    res.json(products);
  });
}

export const productController = new ProductController();
