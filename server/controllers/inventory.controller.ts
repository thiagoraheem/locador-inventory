import { Request, Response } from "express";
import { inventoryService } from "../services/inventory.service";
import { getStorage } from "../db";
import { insertInventorySchema } from "@shared/schema";
import { asyncHandler } from "../utils/async-handler";

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

    const inventoryData: any = {
      code: req.body.code,
      typeId: req.body.typeId,
      startDate:
        typeof req.body.startDate === "string"
          ? new Date(req.body.startDate).getTime()
          : req.body.startDate,
      status: req.body.status || "open",
      isToBlockSystem:
        req.body.isToBlockSystem === true || req.body.isToBlockSystem === "true",
      createdBy: req.user.id,
    };

    if (req.body.endDate) {
      inventoryData.endDate =
        typeof req.body.endDate === "string"
          ? new Date(req.body.endDate).getTime()
          : req.body.endDate;
    }

    if (req.body.predictedEndDate) {
      inventoryData.predictedEndDate =
        typeof req.body.predictedEndDate === "string"
          ? new Date(req.body.predictedEndDate).getTime()
          : req.body.predictedEndDate;
    }

    if (req.body.description) {
      inventoryData.description = req.body.description;
    }

    if (req.body.selectedLocationIds && Array.isArray(req.body.selectedLocationIds)) {
      inventoryData.selectedLocationIds = req.body.selectedLocationIds;
    }

    if (req.body.selectedCategoryIds && Array.isArray(req.body.selectedCategoryIds)) {
      inventoryData.selectedCategoryIds = req.body.selectedCategoryIds;
    }

    const validatedData = insertInventorySchema.partial().parse(inventoryData);
    const inventory = await inventoryService.createInventory(validatedData);

    if (req.body.selectedLocationIds && req.body.selectedCategoryIds) {
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
      oldValues: undefined,
      newValues: JSON.stringify(validatedData),
      metadata: undefined,
    });

    res.status(201).json(inventory);
  });
}

export const inventoryController = new InventoryController();
