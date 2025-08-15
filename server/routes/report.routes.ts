import type { Express } from "express";
import { getStorage } from "../db";
import { isAuthenticated } from "../auth";

export function registerReportRoutes(app: Express) {
  let storage: any;

  // Get comprehensive final report for inventory
  app.get(
    "/api/inventories/:id/final-report",
    isAuthenticated,
    async (req: any, res) => {
      try {
        storage = await getStorage();
        const inventoryId = parseInt(req.params.id);
        const report = await storage.getInventoryFinalReport(inventoryId);
        res.json(report);
      } catch (error) {
        console.error("Error generating final report:", error as Error);
        res.status(500).json({
          message: "Failed to generate final report",
          details: (error as Error).message,
        });
      }
    },
  );

  // Export inventory to CSV
  app.get(
    "/api/inventories/:id/export",
    isAuthenticated,
    async (req: any, res) => {
      try {
        storage = await getStorage();
        const inventoryId = parseInt(req.params.id);

        const inventory = await storage.getInventory(inventoryId);
        if (!inventory) {
          return res.status(404).json({ message: "Inventory not found" });
        }

        const exportData = await storage.getInventoryExportData(inventoryId);
        if (exportData.length === 0) {
          return res.status(404).json({ message: "No data to export" });
        }

        const headers = Object.keys(exportData[0]);
        const csvRows = [
          headers.join(","),
          ...exportData.map((row: any) => headers.map((h) => row[h]).join(",")),
        ];
        const csv = csvRows.join("\n");

        res.setHeader(
          "Content-Disposition",
          `attachment; filename=inventory-${inventoryId}.csv`,
        );
        res.setHeader("Content-Type", "text/csv");
        res.send(csv);
      } catch (error) {
        console.error("Error exporting inventory:", error as Error);
        res.status(500).json({
          message: "Failed to export inventory",
          details: (error as Error).message,
        });
      }
    },
  );

  // Validate inventory integrity
  app.post(
    "/api/inventories/:id/validate",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const inventoryId = parseInt(req.params.id);
        storage = await getStorage();

        const { InventoryIntegrityValidator } = await import("../validation");
        const validator = new InventoryIntegrityValidator(storage);

        const report = await validator.validateInventoryIntegrity(inventoryId);

        await storage.createAuditLog({
          userId: (req.session as any).user?.id || 0,
          action: "VALIDATE_INVENTORY",
          entityType: "inventory",
          entityId: inventoryId.toString(),
          newValues: JSON.stringify({
            isValid: report.isValid,
            issuesCount: report.issues.length,
          }),
        });

        res.json(report);
      } catch (error) {
        console.error("Error validating inventory:", error);
        res.status(500).json({ message: "Failed to validate inventory" });
      }
    },
  );

  // Reconcile inventory quantities
  app.post(
    "/api/inventories/:id/reconcile",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const inventoryId = parseInt(req.params.id);
        storage = await getStorage();
        await storage.reconcileInventoryQuantities(inventoryId);

        const reconciliation = await storage.getInventoryReconciliation(
          inventoryId,
        );

        await storage.createAuditLog({
          userId: (req.session as any).user?.id || 0,
          action: "INVENTORY_RECONCILIATION",
          entityType: "inventory",
          entityId: inventoryId.toString(),
          metadata: JSON.stringify({ itemsReconciled: reconciliation.length }),
        });

        res.json({ message: "Reconciliation completed", data: reconciliation });
      } catch (error) {
        console.error("Error reconciling inventory:", error);
        res.status(500).json({ message: "Failed to reconcile inventory" });
      }
    },
  );

  // Get reconciliation data
  app.get(
    "/api/inventories/:id/reconciliation",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const inventoryId = parseInt(req.params.id);
        storage = await getStorage();
        const reconciliation = await storage.getInventoryReconciliation(
          inventoryId,
        );
        res.json(reconciliation);
      } catch (error) {
        console.error("Error fetching reconciliation data:", error);
        res.status(500).json({ message: "Failed to fetch reconciliation data" });
      }
    },
  );
}

