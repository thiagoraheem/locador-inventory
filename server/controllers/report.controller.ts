import { Request, Response, NextFunction } from "express";
import { reportService } from "../services/report.service";

export class ReportController {
  getFinalReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const inventoryId = parseInt(req.params.id, 10);
      const report = await reportService.getFinalReport(inventoryId);
      res.json(report);
    } catch (error) {
      next(error);
    }
  };

  exportCsv = async (req: Request, res: Response, next: NextFunction) => {
    try {
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
    } catch (error) {
      next(error);
    }
  };

  validateIntegrity = async (req: any, res: Response, next: NextFunction) => {
    try {
      const inventoryId = parseInt(req.params.id, 10);
      const report = await reportService.validateInventoryIntegrity(
        inventoryId,
        req.user?.id || 0,
      );
      res.json(report);
    } catch (error) {
      next(error);
    }
  };

  reconcile = async (req: any, res: Response, next: NextFunction) => {
    try {
      const inventoryId = parseInt(req.params.id, 10);
      const reconciliation = await reportService.reconcileInventory(
        inventoryId,
        req.user?.id || 0,
      );
      res.json({ message: "Reconciliation completed", data: reconciliation });
    } catch (error) {
      next(error);
    }
  };

  getReconciliation = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const inventoryId = parseInt(req.params.id, 10);
      const reconciliation = await reportService.getInventoryReconciliation(
        inventoryId,
      );
      res.json(reconciliation);
    } catch (error) {
      next(error);
    }
  };
}

export const reportController = new ReportController();
