import type { Express } from "express";
import { isAuthenticated } from "../auth";
import { reportService } from "../services/report.service";

export function registerReportRoutes(app: Express) {

  // Get comprehensive final report for inventory
  app.get(
    "/api/inventories/:id/final-report",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const inventoryId = parseInt(req.params.id);
        const report = await reportService.getFinalReport(inventoryId);
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
        const inventoryId = parseInt(req.params.id);
        const result = await reportService.generateInventoryCsv(inventoryId);
        if (!result) {
          return res.status(404).json({ message: "Inventory not found" });
        }
        if (result.csv === null) {
          return res.status(404).json({ message: "No data to export" });
        }
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=inventory-${inventoryId}.csv`,
        );
        res.setHeader("Content-Type", "text/csv");
        res.send(result.csv);
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
        const report = await reportService.validateInventoryIntegrity(
          inventoryId,
          (req.session as any).user?.id || 0,
        );
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
        const reconciliation = await reportService.reconcileInventory(
          inventoryId,
          (req.session as any).user?.id || 0,
        );

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
        const reconciliation = await reportService.getInventoryReconciliation(
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

