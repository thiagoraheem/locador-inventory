import type { Express } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { reportController } from "../controllers/report.controller";

export function registerReportRoutes(app: Express) {

  // Get comprehensive final report for inventory
  app.get(
    "/api/inventories/:id/final-report",
    isAuthenticated,
    reportController.getFinalReport,
  );

  // Export inventory to CSV
  app.get(
    "/api/inventories/:id/export",
    isAuthenticated,
    reportController.exportCsv,
  );

  // Validate inventory integrity
  app.post(
    "/api/inventories/:id/validate",
    isAuthenticated,
    reportController.validateIntegrity,
  );

  // Reconcile inventory quantities
  app.post(
    "/api/inventories/:id/reconcile",
    isAuthenticated,
    reportController.reconcile,
  );

  // Get reconciliation data
  app.get(
    "/api/inventories/:id/reconciliation",
    isAuthenticated,
    reportController.getReconciliation,
  );
}

