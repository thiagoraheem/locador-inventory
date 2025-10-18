import type { Express } from "express";
import { createServer, type Server } from "http";
import { getStorage } from "../db";
import { auditRepository } from "../repositories/audit.repository";
import { setupAuth } from "../auth";
import { isAuthenticated } from "../middlewares/auth.middleware";
import checkIpRouter from "../check-ip";
import swaggerUi from "swagger-ui-express";
import { registerAuthRoutes } from "./auth.routes";
import { registerInventoryRoutes } from "./inventory.routes";
import { registerProductRoutes } from "./product.routes";
import { registerUserRoutes } from "./user.routes";
import { registerReportRoutes } from "./report.routes";
import serialDiscrepanciesRouter from "./serial-discrepancies";
import { logger } from "../utils/logger";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Registrar o router de check-ip
  app.use("/api", checkIpRouter);

  const swaggerDocument = (await import("../../docs/swagger.json", { assert: { type: "json" } })).default;
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // Initialize SQL Server storage
  let storage = await getStorage();

  // Middleware to check if user has Mesa de Controle access for audit mode operations
  app.post("/api/setup-sqlserver", async (req, res) => {
    try {
      // Setting up SQL Server database
      const { setupSqlServerDatabase } = await import("../setup-sqlserver");
      await setupSqlServerDatabase();
      res.json({ message: "SQL Server database setup completed successfully" });
    } catch (error) {
      // Error setting up SQL Server
      res.status(500).json({
        error: "Failed to setup SQL Server database",
        details: (error as Error).message,
      });
    }
  });

  // Database test endpoint
  app.get("/api/test-database", async (req, res) => {
    try {
      // Testing SQL Server connection
      const { testSqlServerConnection } = await import("../setup-sqlserver");
      const connected = await testSqlServerConnection();

      if (connected) {
        storage = await getStorage();
        const stats = await storage.getDashboardStats();
        // Database stats logged

        res.json({
          connected: true,
          stats,
          message: "SQL Server connection successful",
        });
      } else {
        res.status(500).json({ error: "SQL Server connection failed" });
      }
    } catch (error) {
      // SQL Server connection error
      res.status(500).json({
        error: "Database connection failed",
        details: (error as Error).message,
      });
    }
  });

  // Fix inventory schema endpoint
  app.post("/api/fix-inventory-schema", async (req, res) => {
    try {
      // Fixing inventory table schema
      storage = await getStorage();

      // Execute the schema fix using SimpleStorage method
      await storage.fixInventorySchema();

      // Inventory schema fixed successfully
      res.json({
        message: "Inventory schema fixed successfully",
        details:
          "Added selectedLocationIds, selectedCategoryIds, predictedEndDate, and isToBlockSystem columns",
      });
    } catch (error) {
      // Error fixing inventory schema
      res.status(500).json({
        error: "Failed to fix inventory schema",
        details: (error as Error).message,
      });
    }
  });

  registerAuthRoutes(app);
  await registerInventoryRoutes(app);
  registerProductRoutes(app);
  registerUserRoutes(app);
  registerReportRoutes(app);
  
  // Serial discrepancies routes
  app.use("/api/serial-discrepancies", serialDiscrepanciesRouter);

  // Dashboard routes
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      storage = await getStorage();
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      // Error fetching dashboard stats
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Inventory Dashboard Snapshot
  app.get("/api/inventory/snapshot", isAuthenticated, async (req, res) => {
    try {
      storage = await getStorage();
      
      // Buscar dados básicos do inventário
      const inventories = await storage.getInventories();
      const activeInventory = inventories.find(inv => inv.status === 'ACTIVE' || inv.status === 'IN_PROGRESS');
      
      if (!activeInventory) {
        return res.json({
          kpis: {
            totalItems: 0,
            countedItems: 0,
            divergentItems: 0,
            pendingItems: 0,
            accuracy: 0,
            totalValue: 0,
            countedValue: 0,
            divergentValue: 0
          },
          progress: {
            overall: 0,
            counting: 0,
            validation: 0,
            reconciliation: 0
          },
          charts: {
            statusDistribution: [],
            locationProgress: [],
            categoryBreakdown: [],
            consistencyTimeline: []
          },
          compliance: {
            processStatus: 'NOT_STARTED',
            securityCompliance: 'PENDING',
            auditTrail: 'INCOMPLETE'
          },
          items: [],
          lastUpdated: new Date().toISOString()
        });
      }
      
      // Buscar estatísticas do inventário ativo
      const stats = await storage.getInventoryStats(activeInventory.id);
      const items = await storage.getInventoryItemsWithDetails(activeInventory.id);
      
      // Calcular KPIs
      const totalItems = items.length;
      const countedItems = items.filter(item => item.count1 !== null || item.count2 !== null).length;
      const divergentItems = items.filter(item => {
        const hasCount = item.count1 !== null || item.count2 !== null;
        const expectedQty = item.expectedQuantity || 0;
        const actualQty = item.count1 || item.count2 || 0;
        return hasCount && Math.abs(expectedQty - actualQty) > 0;
      }).length;
      const pendingItems = totalItems - countedItems;
      
      const accuracy = totalItems > 0 ? ((totalItems - divergentItems) / totalItems) * 100 : 0;
      
      // Calcular valores (simulado)
      const totalValue = items.reduce((sum, item) => sum + ((item.expectedQuantity || 0) * (item.product?.costValue || 0)), 0);
      const countedValue = items.reduce((sum, item) => {
        const qty = item.count1 || item.count2 || 0;
        return sum + (qty * (item.product?.costValue || 0));
      }, 0);
      const divergentValue = items.reduce((sum, item) => {
        const hasCount = item.count1 !== null || item.count2 !== null;
        const expectedQty = item.expectedQuantity || 0;
        const actualQty = item.count1 || item.count2 || 0;
        const isDivergent = hasCount && Math.abs(expectedQty - actualQty) > 0;
        return isDivergent ? sum + (Math.abs(expectedQty - actualQty) * (item.product?.costValue || 0)) : sum;
      }, 0);
      
      // Calcular progresso
      const overallProgress = totalItems > 0 ? (countedItems / totalItems) * 100 : 0;
      const countingProgress = overallProgress;
      const validationProgress = divergentItems > 0 ? Math.max(0, overallProgress - 20) : overallProgress;
      const reconciliationProgress = Math.max(0, validationProgress - 10);
      
      // Preparar dados dos gráficos
      const statusDistribution = [
        { name: 'Contados', value: countedItems, color: '#22c55e' },
        { name: 'Pendentes', value: pendingItems, color: '#f59e0b' },
        { name: 'Divergentes', value: divergentItems, color: '#ef4444' }
      ];
      
      const locations = await storage.getLocations();
      const locationProgress = locations.slice(0, 5).map(location => {
        const locationItems = items.filter(item => item.locationId === location.id);
        const locationCounted = locationItems.filter(item => item.count1 !== null || item.count2 !== null).length;
        const progress = locationItems.length > 0 ? (locationCounted / locationItems.length) * 100 : 0;
        return {
          location: location.name,
          progress: Math.round(progress),
          total: locationItems.length,
          counted: locationCounted
        };
      });
      
      const categories = await storage.getCategories();
      const categoryBreakdown = categories.slice(0, 6).map(category => {
        const categoryItems = items.filter(item => item.product?.categoryId === category.id);
        const categoryValue = categoryItems.reduce((sum, item) => sum + ((item.expectedQuantity || 0) * (item.product?.costValue || 0)), 0);
        return {
          category: category.name,
          value: Math.round(categoryValue),
          items: categoryItems.length
        };
      });
      
      // Timeline de consistência (últimos 7 dias)
      const consistencyTimeline = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dayAccuracy = Math.max(0, accuracy - Math.random() * 10);
        const dayProgress = Math.min(100, overallProgress + (i * 5) + Math.random() * 10);
        return {
          date: date.toISOString().split('T')[0],
          accuracy: Math.round(dayAccuracy * 100) / 100,
          progress: Math.round(dayProgress * 100) / 100
        };
      });
      
      // Status de conformidade
      const processStatus = overallProgress > 80 ? 'COMPLIANT' : overallProgress > 50 ? 'IN_PROGRESS' : 'NOT_STARTED';
      const securityCompliance = 'COMPLIANT'; // Simulado
      const auditTrail = countedItems > 0 ? 'COMPLETE' : 'INCOMPLETE';
      
      const dashboardData = {
        kpis: {
          totalItems,
          countedItems,
          divergentItems,
          pendingItems,
          accuracy: Math.round(accuracy * 100) / 100,
          totalValue: Math.round(totalValue * 100) / 100,
          countedValue: Math.round(countedValue * 100) / 100,
          divergentValue: Math.round(divergentValue * 100) / 100
        },
        progress: {
          overall: Math.round(overallProgress * 100) / 100,
          counting: Math.round(countingProgress * 100) / 100,
          validation: Math.round(validationProgress * 100) / 100,
          reconciliation: Math.round(reconciliationProgress * 100) / 100
        },
        charts: {
          statusDistribution,
          locationProgress,
          categoryBreakdown,
          consistencyTimeline
        },
        compliance: {
          processStatus,
          securityCompliance,
          auditTrail
        },
        items: items.slice(0, 50).map(item => ({
          id: item.id,
          code: item.product?.sku || 'N/A',
          description: item.product?.name || 'Produto sem nome',
          location: item.location?.name || 'Local não definido',
          expected: item.expectedQuantity || 0,
          counted: item.count1 || item.count2 || null,
          status: item.count1 !== null || item.count2 !== null ? 
            (Math.abs((item.expectedQuantity || 0) - (item.count1 || item.count2 || 0)) === 0 ? 'OK' : 'DIVERGENT') : 
            'PENDING',
          value: ((item.expectedQuantity || 0) * (item.product?.costValue || 0)),
          lastCount: item.updatedAt || item.createdAt
        })),
        lastUpdated: new Date().toISOString()
      };
      
      res.json(dashboardData);
    } catch (error) {
      console.error('Error fetching inventory snapshot:', error);
      res.status(500).json({ message: "Failed to fetch inventory snapshot" });
    }
  });

  // Category routes
  app.get("/api/categories", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      // Error fetching categories
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
      // Error fetching locations
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
      // Error fetching stock
      res.status(500).json({ message: "Failed to fetch stock" });
    }
  });

  // Count routes
  // Audit log routes
  app.get("/api/audit-logs", isAuthenticated, async (req: any, res) => {
    try {
      const logs = await auditRepository.findAll();
      res.json(logs);
    } catch (error) {
      // Error fetching audit logs
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Companies routes (read-only)
  app.get("/api/companies", isAuthenticated, async (req: any, res) => {
    try {
      logger.debug('Fetching companies...');
      storage = await getStorage();
      logger.debug('Storage obtained successfully');
      const companies = await storage.getCompanies();
      logger.debug('Companies fetched:', companies?.length || 0, 'records');
      res.json(companies);
    } catch (error) {
      logger.error('Failed to fetch companies:', error);
      // Error fetching companies
      res.status(500).json({ message: "Failed to fetch companies", error: error.message });
    }
  });

  // Stock Items routes (read-only)
  app.get("/api/stock-items", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const stockItems = await storage.getStockItems();
      res.json(stockItems);
    } catch (error) {
      // Error fetching stock items
      res.status(500).json({ message: "Failed to fetch stock items" });
    }
  });


  return createServer(app);
}
