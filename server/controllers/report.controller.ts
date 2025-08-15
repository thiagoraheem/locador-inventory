import { Request, Response } from "express";
import { reportService } from "../services/report.service";
import { asyncHandler } from "../utils/async-handler";

export class ReportController {
  getFinalReport = asyncHandler(async (req: Request, res: Response) => {
    const inventoryId = parseInt(req.params.id, 10);
    const report = await reportService.getFinalReport(inventoryId);
    res.json(report);
  });

  exportCsv = asyncHandler(async (req: Request, res: Response) => {
    const inventoryId = parseInt(req.params.id, 10);
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
  });

  validateIntegrity = asyncHandler(async (req: any, res: Response) => {
    const inventoryId = parseInt(req.params.id, 10);
    const report = await reportService.validateInventoryIntegrity(
      inventoryId,
      req.user?.id || 0,
    );
    res.json(report);
  });

  reconcile = asyncHandler(async (req: any, res: Response) => {
    const inventoryId = parseInt(req.params.id, 10);
    const reconciliation = await reportService.reconcileInventory(
      inventoryId,
      req.user?.id || 0,
    );
    res.json({ message: "Reconciliation completed", data: reconciliation });
  });

  getReconciliation = asyncHandler(async (req: Request, res: Response) => {
    const inventoryId = parseInt(req.params.id, 10);
    const reconciliation = await reportService.getInventoryReconciliation(
      inventoryId,
    );
    res.json(reconciliation);
  });
}

export const reportController = new ReportController();
