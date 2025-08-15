import { getStorage } from "../db";

export class ReportService {
  async getFinalReport(inventoryId: number) {
    const storage = await getStorage();
    return storage.getInventoryFinalReport(inventoryId);
  }

  async generateInventoryCsv(inventoryId: number) {
    const storage = await getStorage();
    const inventory = await storage.getInventory(inventoryId);
    if (!inventory) {
      return null;
    }
    const exportData = await storage.getInventoryExportData(inventoryId);
    if (exportData.length === 0) {
      return { csv: null };
    }
    const headers = Object.keys(exportData[0]);
    const csvRows = [
      headers.join(","),
      ...exportData.map((row: any) => headers.map((h) => row[h]).join(",")),
    ];
    const csv = csvRows.join("\n");
    return { csv };
  }

  async validateInventoryIntegrity(inventoryId: number, userId: number) {
    const storage = await getStorage();
    const { InventoryIntegrityValidator } = await import("../validation");
    const validator = new InventoryIntegrityValidator(storage);
    const report = await validator.validateInventoryIntegrity(inventoryId);

    await storage.createAuditLog({
      userId,
      action: "VALIDATE_INVENTORY",
      entityType: "inventory",
      entityId: inventoryId.toString(),
      newValues: JSON.stringify({
        isValid: report.isValid,
        issuesCount: report.issues.length,
      }),
    });

    return report;
  }

  async reconcileInventory(inventoryId: number, userId: number) {
    const storage = await getStorage();
    await storage.reconcileInventoryQuantities(inventoryId);
    const reconciliation = await storage.getInventoryReconciliation(inventoryId);

    await storage.createAuditLog({
      userId,
      action: "INVENTORY_RECONCILIATION",
      entityType: "inventory",
      entityId: inventoryId.toString(),
      metadata: JSON.stringify({ itemsReconciled: reconciliation.length }),
    });

    return reconciliation;
  }

  async getInventoryReconciliation(inventoryId: number) {
    const storage = await getStorage();
    return storage.getInventoryReconciliation(inventoryId);
  }
}

export const reportService = new ReportService();
