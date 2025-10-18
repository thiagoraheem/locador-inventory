import { Request, Response } from "express";
import { inventoryService } from "../services/inventory.service";
import { getStorage } from "../db";
import { insertInventorySchema } from "@shared/schema";
import { asyncHandler } from "../utils/async-handler";
import { logger } from "../utils/logger";

export class InventoryController {
  getTypes = asyncHandler(async (_req: Request, res: Response) => {
    const types = await inventoryService.getInventoryTypes();
    res.json(types);
  });

  list = asyncHandler(async (_req: Request, res: Response) => {
    const inventories = await inventoryService.getInventories();
    res.json(inventories);
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const inventory = await inventoryService.getInventory(id);
    if (!inventory) {
      return res.status(404).json({ message: "Inventory not found" });
    }
    res.json(inventory);
  });

  create = asyncHandler(async (req: any, res: Response) => {
    const storage = await getStorage();
    
    // Debug logs para verificar dados recebidos
    logger.debug('Dados recebidos no controller:', JSON.stringify(req.body, null, 2));
    logger.debug('selectedProductIds:', req.body.selectedProductIds);
    logger.debug('selectedCategoryIds:', req.body.selectedCategoryIds);
    logger.debug('selectedLocationIds:', req.body.selectedLocationIds);
    logger.debug('type:', req.body.type);

    const inventoryData: any = {
      code: req.body.code,
      typeId: req.body.typeId,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      predictedEndDate: req.body.predictedEndDate,
      description: req.body.description,
      status: req.body.status || "open",
      isToBlockSystem: req.body.isToBlockSystem || false,
      createdBy: req.user.id,
    };

    if (req.body.selectedLocationIds && Array.isArray(req.body.selectedLocationIds)) {
      inventoryData.selectedLocationIds = req.body.selectedLocationIds;
    }

    if (req.body.selectedCategoryIds && Array.isArray(req.body.selectedCategoryIds)) {
      inventoryData.selectedCategoryIds = req.body.selectedCategoryIds;
    }

    if (req.body.selectedProductIds && Array.isArray(req.body.selectedProductIds)) {
      inventoryData.selectedProductIds = req.body.selectedProductIds;
    }

    logger.debug('inventoryData antes da validação:', JSON.stringify(inventoryData, null, 2));

    const validatedData = insertInventorySchema.partial().parse(inventoryData);
    
    logger.debug('validatedData após validação:', JSON.stringify(validatedData, null, 2));
    
    const inventory = await inventoryService.createInventory(validatedData);

    // Only create inventory items for non-Rotativo types here
    // Rotativo types are handled in inventoryService.generateRotativeInventoryItems
    const types = await inventoryService.getInventoryTypes();
    const inventoryType = types.find((t: any) => t.id === validatedData.typeId);
    
    if (inventoryType?.name !== 'Rotativo' && req.body.selectedLocationIds && req.body.selectedCategoryIds) {
      const { selectedLocationIds, selectedCategoryIds } = req.body;
      const stockItems = await storage.getStock();
      const products = await storage.getProducts();

      for (const locationId of selectedLocationIds) {
        const locationStock = stockItems.filter(
          (item: any) => item.locationId === locationId,
        );

        for (const stockItem of locationStock) {
          const product = products.find((p: any) => p.id === stockItem.productId);
          if (product && selectedCategoryIds.includes(product.categoryId)) {
            await storage.createInventoryItem({
              inventoryId: inventory.id,
              productId: stockItem.productId,
              locationId: stockItem.locationId,
              expectedQuantity: stockItem.quantity,
              status: "pending",
            });
          }
        }
      }

      try {
        await storage.createInventorySerialItems(inventory.id);
      } catch (serialError) {
        // Failed to create serial items
      }
    }

    await storage.createAuditLog({
      userId: req.user.id,
      action: "CREATE",
      entityType: "INVENTORY",
      entityId: inventory.id.toString(),
      oldValues: null,
      newValues: JSON.stringify(validatedData),
      metadata: null,
    });

    res.status(201).json(inventory);
  });
}

export const inventoryController = new InventoryController();
