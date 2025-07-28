import type { Express } from "express";
import { createServer, type Server } from "http";
import { getStorage } from "./db";
import {
  setupAuth,
  isAuthenticated,
  hashPassword,
  verifyPassword,
  createDefaultAdmin,
} from "./auth";
import {
  insertProductSchema,
  insertCategorySchema,
  insertLocationSchema,
  insertStockSchema,
  insertInventorySchema,
  insertInventoryTypeSchema,
  insertCountSchema,
  insertUserSchema,
  loginSchema,
  registerSchema,
  insertInventoryStockItemSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Initialize SQL Server storage
  let storage = await getStorage();

  // Database setup endpoint
  app.post("/api/setup-sqlserver", async (req, res) => {
    try {
      console.log("🔧 Setting up SQL Server database...");
      const { setupSqlServerDatabase } = await import("./setup-sqlserver");
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
      const { testSqlServerConnection } = await import("./setup-sqlserver");
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

  // Migration endpoint for adding costValue column
  /*app.post('/api/migrate-cost-value', async (req, res) => {
    try {
      console.log('🔄 Running costValue migration...');
      const { addCostValueColumn } = await import('./migrate-add-cost-value');
      await addCostValueColumn();
      res.json({ message: "costValue column migration completed successfully" });
    } catch (error) {
      console.error("Error running costValue migration:", error as Error);
      res.status(500).json({ error: "Failed to run costValue migration", details: (error as Error).message });
    }
  });*/

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);

      storage = await getStorage();
      const user = await storage.getUserByUsername(username);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      // Create session
      const session = req.session as any;
      session.userId = user.id;

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);

      storage = await getStorage();
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Nome de usuário já existe" });
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(userData.password);
      const { confirmPassword, ...userDataWithoutConfirm } = userData;

      const newUser = await storage.createUser({
        ...userDataWithoutConfirm,
        password: hashedPassword,
        role: "user",
        isActive: true,
      });

      // Create session
      const session = req.session as any;
      session.userId = newUser.id;

      // Return user without password
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Error during registration:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const session = req.session as any;
    session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const { password: _, ...userWithoutPassword } = req.user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

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

  // Product routes
  app.get("/api/products", isAuthenticated, async (req, res) => {
    try {
      storage = await getStorage();
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error as Error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      storage = await getStorage();
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error as Error);
      res.status(500).json({ message: "Failed to fetch product" });
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

  // Inventory routes
  app.get("/api/inventory-types", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const types = await storage.getInventoryTypes();
      res.json(types);
    } catch (error) {
      console.error("Error fetching inventory types:", error as Error);
      res.status(500).json({ message: "Failed to fetch inventory types" });
    }
  });

  app.get("/api/inventories", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const inventories = await storage.getInventories();
      res.json(inventories);
    } catch (error) {
      console.error("Error fetching inventories:", error as Error);
      res.status(500).json({ message: "Failed to fetch inventories" });
    }
  });

  app.get("/api/inventories/:id", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const id = parseInt(req.params.id);
      const inventory = await storage.getInventory(id);
      if (!inventory) {
        return res.status(404).json({ message: "Inventory not found" });
      }
      res.json(inventory);
    } catch (error) {
      console.error("Error fetching inventory:", error as Error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.post("/api/inventories", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      // Convert date strings to Date objects before validation
      const bodyWithDates = {
        ...req.body,
        startDate: req.body.startDate
          ? new Date(req.body.startDate)
          : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        createdBy: req.user.id,
      };

      const inventoryData = insertInventorySchema.parse(bodyWithDates);

      const inventory = await storage.createInventory(inventoryData);

      await storage.createAuditLog({
        userId: req.user.id,
        action: "CREATE",
        entityType: "INVENTORY",
        entityId: inventory.id.toString(),
        oldValues: null,
        newValues: inventoryData,
        metadata: null,
      });

      res.status(201).json(inventory);
    } catch (error) {
      console.error("Error creating inventory:", error as Error);
      res.status(500).json({ message: "Failed to create inventory" });
    }
  });

  app.put("/api/inventories/:id", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const id = parseInt(req.params.id);
      const oldInventory = await storage.getInventory(id);
      if (!oldInventory) {
        return res.status(404).json({ message: "Inventory not found" });
      }

      const inventoryData = insertInventorySchema.partial().parse(req.body);
      const inventory = await storage.updateInventory(id, inventoryData);

      await storage.createAuditLog({
        userId: req.user.id,
        action: "UPDATE",
        entityType: "INVENTORY",
        entityId: id.toString(),
        oldValues: oldInventory,
        newValues: inventoryData,
        metadata: null,
      });

      res.json(inventory);
    } catch (error) {
      console.error("Error updating inventory:", error as Error);
      res.status(500).json({ message: "Failed to update inventory" });
    }
  });

  app.post(
    "/api/inventories/:id/close",
    isAuthenticated,
    async (req: any, res) => {
      try {
        storage = await getStorage();
        const id = parseInt(req.params.id);
        const oldInventory = await storage.getInventory(id);
        if (!oldInventory) {
          return res.status(404).json({ message: "Inventory not found" });
        }

        await storage.closeInventory(id);

        await storage.createAuditLog({
          userId: req.user.id,
          action: "CLOSE",
          entityType: "INVENTORY",
          entityId: id.toString(),
          oldValues: oldInventory,
          newValues: { status: "CLOSED" },
          metadata: null,
        });

        res.json({ message: "Inventory closed successfully" });
      } catch (error) {
        console.error("Error closing inventory:", error as Error);
        res.status(500).json({ message: "Failed to close inventory" });
      }
    },
  );

  // Inventory items routes
  app.get(
    "/api/inventories/:id/items",
    isAuthenticated,
    async (req: any, res) => {
      try {
        storage = await getStorage();
        const items = await storage.getInventoryItems();
        res.json(items);
      } catch (error) {
        console.error("Error fetching inventory items:", error as Error);
        res.status(500).json({ message: "Failed to fetch inventory items" });
      }
    },
  );

  // Count routes
  app.get(
    "/api/inventory-items/:id/counts",
    isAuthenticated,
    async (req: any, res) => {
      try {
        storage = await getStorage();
        const counts = await storage.getCounts();
        res.json(counts);
      } catch (error) {
        console.error("Error fetching counts:", error as Error);
        res.status(500).json({ message: "Failed to fetch counts" });
      }
    },
  );

  app.post("/api/counts", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const countData = insertCountSchema.parse({
        ...req.body,
        countedBy: req.user.id,
      });

      const count = await storage.createCount(countData);

      await storage.createAuditLog({
        userId: req.user.id,
        action: "CREATE",
        entityType: "COUNT",
        entityId: count.id.toString(),
        oldValues: null,
        newValues: countData,
        metadata: null,
      });

      res.status(201).json(count);
    } catch (error) {
      console.error("Error creating count:", error as Error);
      res.status(500).json({ message: "Failed to create count" });
    }
  });

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

  // User management routes
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error as Error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();

      // Hash password if provided
      const userData = { ...req.body };
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      }

      // Validate the user data (excluding password confirmation if present)
      const { confirmPassword, ...userDataToValidate } = userData;
      const validatedData = insertUserSchema.parse(userDataToValidate);

      const user = await storage.createUser(validatedData);

      await storage.createAuditLog({
        userId: req.user.id,
        action: "CREATE",
        entityType: "USER",
        entityId: user.id.toString(),
        oldValues: null,
        newValues: { ...validatedData, password: "[REDACTED]" },
        metadata: null,
      });

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error as Error);
      res.status(500).json({
        message: "Failed to create user",
        details: (error as Error).message,
      });
    }
  });

  app.put("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const id = req.params.id;
      const oldUser = await storage.getUser(id);
      if (!oldUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hash password if provided
      const userData = { ...req.body };
      if (userData.password && userData.password.trim() !== "") {
        userData.password = await hashPassword(userData.password);
      } else {
        // Remove password field if empty
        delete userData.password;
      }

      // Remove confirmPassword if present
      const { confirmPassword, ...userDataToValidate } = userData;
      const validatedData = insertUserSchema
        .partial()
        .parse(userDataToValidate);

      const user = await storage.updateUser(id, validatedData);

      await storage.createAuditLog({
        userId: req.user.id,
        action: "UPDATE",
        entityType: "USER",
        entityId: id,
        oldValues: { ...oldUser, password: "[REDACTED]" },
        newValues: {
          ...validatedData,
          password: validatedData.password ? "[REDACTED]" : undefined,
        },
        metadata: null,
      });

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error as Error);
      res.status(500).json({
        message: "Failed to update user",
        details: (error as Error).message,
      });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const id = req.params.id;
      const oldUser = await storage.getUser(id);
      if (!oldUser) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.deleteUser(id);

      await storage.createAuditLog({
        userId: req.user.id,
        action: "DELETE",
        entityType: "USER",
        entityId: id,
        oldValues: oldUser,
        newValues: null,
        metadata: null,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error as Error);
      res.status(500).json({ message: "Failed to delete user" });
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

  // Enhanced Inventory Management Routes

  // Create inventory with location/category selection
  app.post("/api/inventories/advanced", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const validatedData = insertInventorySchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });

      const inventory = await storage.createInventoryWithSelection(validatedData);
      
      await storage.createAuditLog({
        userId: req.user.id,
        action: "CREATE_ADVANCED_INVENTORY",
        entityType: "inventory",
        entityId: inventory.id.toString(),
        newValues: JSON.stringify(validatedData),
        metadata: JSON.stringify({ 
          selectedLocationIds: validatedData.selectedLocationIds,
          selectedCategoryIds: validatedData.selectedCategoryIds 
        }),
      });

      res.status(201).json(inventory);
    } catch (error) {
      console.error("Error creating advanced inventory:", error as Error);
      res.status(500).json({
        message: "Failed to create advanced inventory",
        details: (error as Error).message,
      });
    }
  });

  // Transition inventory status
  app.put("/api/inventories/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const inventoryId = parseInt(req.params.id);
      const { status } = req.body;

      // Validate status transition
      const validStatuses = ['planning', 'open', 'count1', 'count2', 'count3', 'audit', 'divergence', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid inventory status" });
      }

      await storage.transitionInventoryStatus(inventoryId, status, req.user.id);
      res.json({ message: "Inventory status updated successfully" });
    } catch (error) {
      console.error("Error updating inventory status:", error as Error);
      res.status(500).json({
        message: "Failed to update inventory status",
        details: (error as Error).message,
      });
    }
  });

  // Get inventory statistics for Control Panel
  app.get("/api/inventories/:id/stats", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const inventoryId = parseInt(req.params.id);
      const stats = await storage.getInventoryStats(inventoryId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching inventory stats:", error as Error);
      res.status(500).json({
        message: "Failed to fetch inventory statistics",
        details: (error as Error).message,
      });
    }
  });

  // Update count 1 for inventory item
  app.put("/api/inventory-items/:id/count1", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const itemId = parseInt(req.params.id);
      const { count } = req.body;

      await storage.updateCount1(itemId, count, req.user.id);
      
      await storage.createAuditLog({
        userId: req.user.id,
        action: "UPDATE_COUNT1",
        entityType: "inventory_item",
        entityId: itemId.toString(),
        newValues: JSON.stringify({ count1: count }),
        metadata: JSON.stringify({ countedAt: Date.now() }),
      });

      res.json({ message: "Count 1 updated successfully" });
    } catch (error) {
      console.error("Error updating count 1:", error as Error);
      res.status(500).json({
        message: "Failed to update count 1",
        details: (error as Error).message,
      });
    }
  });

  // Update count 2 for inventory item
  app.put("/api/inventory-items/:id/count2", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const itemId = parseInt(req.params.id);
      const { count } = req.body;

      await storage.updateCount2(itemId, count, req.user.id);
      
      await storage.createAuditLog({
        userId: req.user.id,
        action: "UPDATE_COUNT2",
        entityType: "inventory_item",
        entityId: itemId.toString(),
        newValues: JSON.stringify({ count2: count }),
        metadata: JSON.stringify({ countedAt: Date.now() }),
      });

      res.json({ message: "Count 2 updated successfully" });
    } catch (error) {
      console.error("Error updating count 2:", error as Error);
      res.status(500).json({
        message: "Failed to update count 2",
        details: (error as Error).message,
      });
    }
  });

  // Update count 3 for inventory item
  app.put("/api/inventory-items/:id/count3", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const itemId = parseInt(req.params.id);
      const { count } = req.body;

      await storage.updateCount3(itemId, count, req.user.id);
      
      await storage.createAuditLog({
        userId: req.user.id,
        action: "UPDATE_COUNT3",
        entityType: "inventory_item",
        entityId: itemId.toString(),
        newValues: JSON.stringify({ count3: count }),
        metadata: JSON.stringify({ countedAt: Date.now() }),
      });

      res.json({ message: "Count 3 updated successfully" });
    } catch (error) {
      console.error("Error updating count 3:", error as Error);
      res.status(500).json({
        message: "Failed to update count 3",
        details: (error as Error).message,
      });
    }
  });

  // Update count 4 (audit) for inventory item
  app.put("/api/inventory-items/:id/count4", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const itemId = parseInt(req.params.id);
      const { count } = req.body;

      await storage.updateCount4(itemId, count, req.user.id);
      
      await storage.createAuditLog({
        userId: req.user.id,
        action: "UPDATE_COUNT4_AUDIT",
        entityType: "inventory_item",
        entityId: itemId.toString(),
        newValues: JSON.stringify({ count4: count }),
        metadata: JSON.stringify({ countedAt: Date.now() }),
      });

      res.json({ message: "Audit count updated successfully" });
    } catch (error) {
      console.error("Error updating audit count:", error as Error);
      res.status(500).json({
        message: "Failed to update audit count",
        details: (error as Error).message,
      });
    }
  });

  // Get stock items for inventory (patrimônio control)
  app.get("/api/inventories/:id/stock-items", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const inventoryId = parseInt(req.params.id);
      const stockItems = await storage.getInventoryStockItems(inventoryId);
      res.json(stockItems);
    } catch (error) {
      console.error("Error fetching inventory stock items:", error as Error);
      res.status(500).json({
        message: "Failed to fetch inventory stock items",
        details: (error as Error).message,
      });
    }
  });

  // Update count for stock item (patrimônio)
  app.put("/api/inventory-stock-items/:id/count", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const itemId = parseInt(req.params.id);
      const { count, countType } = req.body;

      // Validate count type
      const validCountTypes = ['count1', 'count2', 'count3', 'count4'];
      if (!validCountTypes.includes(countType)) {
        return res.status(400).json({ message: "Invalid count type" });
      }

      await storage.updateInventoryStockItemCount(itemId, {
        count,
        countBy: req.user.id,
        countType,
      });
      
      await storage.createAuditLog({
        userId: req.user.id,
        action: `UPDATE_STOCK_ITEM_${countType.toUpperCase()}`,
        entityType: "inventory_stock_item",
        entityId: itemId.toString(),
        newValues: JSON.stringify({ [countType]: count }),
        metadata: JSON.stringify({ countedAt: Date.now() }),
      });

      res.json({ message: "Stock item count updated successfully" });
    } catch (error) {
      console.error("Error updating stock item count:", error as Error);
      res.status(500).json({
        message: "Failed to update stock item count",
        details: (error as Error).message,
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
