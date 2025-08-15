import type { Express } from "express";
import { createServer, type Server } from "http";
import { getStorage } from "../db";
import { setupAuth, isAuthenticated } from "../auth";
import checkIpRouter from "../check-ip";
import { registerAuthRoutes } from "./auth.routes";
import { registerInventoryRoutes } from "./inventory.routes";
import { registerProductRoutes } from "./product.routes";
import { registerUserRoutes } from "./user.routes";
import { registerReportRoutes } from "./report.routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Registrar o router de check-ip
  app.use("/api", checkIpRouter);

  // Initialize SQL Server storage
  let storage = await getStorage();

  // Middleware to check if user has Mesa de Controle access for audit mode operations
  app.post("/api/setup-sqlserver", async (req, res) => {
    try {
      console.log("🔧 Setting up SQL Server database...");
      const { setupSqlServerDatabase } = await import("../setup-sqlserver");
      await setupSqlServerDatabase();
      res.json({ message: "SQL Server database setup completed successfully" });
    } catch (error) {
      console.error("Error setting up SQL Server:", error as Error);
      res.status(500).json({
        error: "Failed to setup SQL Server database",
        details: (error as Error).message,
      });
    }
  });

  // Database test endpoint
  app.get("/api/test-database", async (req, res) => {
    try {
      console.log("🔍 Testing SQL Server connection...");
      const { testSqlServerConnection } = await import("../setup-sqlserver");
      const connected = await testSqlServerConnection();

      if (connected) {
        storage = await getStorage();
        const stats = await storage.getDashboardStats();
        console.log("📊 Database stats:", stats);

        res.json({
          connected: true,
          stats,
          message: "SQL Server connection successful",
        });
      } else {
        res.status(500).json({ error: "SQL Server connection failed" });
      }
    } catch (error) {
      console.error("SQL Server connection error:", error as Error);
      res.status(500).json({
        error: "Database connection failed",
        details: (error as Error).message,
      });
    }
  });

  // Fix inventory schema endpoint
  app.post("/api/fix-inventory-schema", async (req, res) => {
    try {
      console.log("🔧 Fixing inventory table schema...");
      storage = await getStorage();

      // Execute the schema fix using SimpleStorage method
      await storage.fixInventorySchema();

      console.log("✅ Inventory schema fixed successfully");
      res.json({
        message: "Inventory schema fixed successfully",
        details:
          "Added selectedLocationIds, selectedCategoryIds, predictedEndDate, and isToBlockSystem columns",
      });
    } catch (error) {
      console.error("Error fixing inventory schema:", error as Error);
      res.status(500).json({
        error: "Failed to fix inventory schema",
        details: (error as Error).message,
      });
    }
  });

  registerAuthRoutes(app);
  registerInventoryRoutes(app);
  registerProductRoutes(app);
  registerUserRoutes(app);
  registerReportRoutes(app);

  // Dashboard routes
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      storage = await getStorage();
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Category routes
  app.get("/api/categories", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Location routes
  app.get("/api/locations", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const locations = await storage.getLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error as Error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  // Stock routes
  app.get("/api/stock", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const stock = await storage.getStock();
      res.json(stock);
    } catch (error) {
      console.error("Error fetching stock:", error as Error);
      res.status(500).json({ message: "Failed to fetch stock" });
    }
  });

  // Count routes
  // Audit log routes
  app.get("/api/audit-logs", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const logs = await storage.getAuditLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error as Error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Companies routes (read-only)
  app.get("/api/companies", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error as Error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  // Stock Items routes (read-only)
  app.get("/api/stock-items", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const stockItems = await storage.getStockItems();
      res.json(stockItems);
    } catch (error) {
      console.error("Error fetching stock items:", error as Error);
      res.status(500).json({ message: "Failed to fetch stock items" });
    }
  });


  return createServer(app);
}
