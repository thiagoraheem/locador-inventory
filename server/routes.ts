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
  insertInventorySerialItemSchema,
  serialReadingRequestSchema,
  updateProductSerialControlSchema,
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
      
      // Prepare data with proper formatting and date conversion
      const inventoryData: any = {
        code: req.body.code,
        typeId: req.body.typeId,
        startDate: typeof req.body.startDate === 'string' ? new Date(req.body.startDate).getTime() : req.body.startDate,
        status: req.body.status || 'open',
        createdBy: req.user.id,
      };

      // Only add optional fields if they have values
      if (req.body.endDate) {
        inventoryData.endDate = typeof req.body.endDate === 'string' ? new Date(req.body.endDate).getTime() : req.body.endDate;
      }
      
      if (req.body.predictedEndDate) {
        inventoryData.predictedEndDate = typeof req.body.predictedEndDate === 'string' ? new Date(req.body.predictedEndDate).getTime() : req.body.predictedEndDate;
      }
      
      if (req.body.description) {
        inventoryData.description = req.body.description;
      }

      // Use partial validation to allow optional fields
      const validatedData = insertInventorySchema.partial().parse(inventoryData);

      const inventory = await storage.createInventory(validatedData);

      // Create inventory items if locations and categories are provided
      if (req.body.selectedLocationIds && req.body.selectedCategoryIds) {
        const { selectedLocationIds, selectedCategoryIds } = req.body;
        
        // Get stock data for selected locations and categories
        const stockItems = await storage.getStock();
        const products = await storage.getProducts();
        
        for (const locationId of selectedLocationIds) {
          const locationStock = stockItems.filter((item: any) => item.locationId === locationId);
          
          for (const stockItem of locationStock) {
            const product = products.find((p: any) => p.id === stockItem.productId);
            if (product && selectedCategoryIds.includes(product.categoryId)) {
              await storage.createInventoryItem({
                inventoryId: inventory.id,
                productId: stockItem.productId,
                locationId: stockItem.locationId,
                expectedQuantity: stockItem.quantity,
                status: 'pending',
              });
            }
          }
        }
      }

      // Temporarily disable audit log to test inventory creation
      /*
      await storage.createAuditLog({
        userId: req.user.id,
        action: "CREATE",
        entityType: "INVENTORY",
        entityId: inventory.id.toString(),
        oldValues: undefined,
        newValues: JSON.stringify(validatedData),
        metadata: undefined,
      });
      */

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
      const validStatuses = ['planning', 'open', 'count1_open', 'count1_closed', 'count2_open', 'count2_closed', 'count3_open', 'count3_closed', 'audit', 'divergence', 'closed'];
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

  // Get products with serial control information
  app.get("/api/products/with-serial-control", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const products = await storage.getProductsWithSerialControl();
      res.json(products);
    } catch (error) {
      console.error('Error fetching products with serial control:', error);
      res.status(500).json({ message: "Failed to fetch products with serial control" });
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

  // Start counting - transitions to next counting stage
  app.put("/api/inventories/:id/start-counting", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const inventoryId = parseInt(req.params.id);

      const inventory = await storage.getInventory(inventoryId);
      if (!inventory) {
        return res.status(404).json({ message: "Inventory not found" });
      }

      let newStatus: string;
      switch (inventory.status) {
        case 'open':
          newStatus = 'count1_open';
          break;
        case 'count1_closed':
          newStatus = 'count2_open';
          break;
        case 'count2_closed':
          newStatus = 'count3_open';
          break;
        default:
          return res.status(400).json({ message: "Cannot start counting from current status" });
      }

      await storage.transitionInventoryStatus(inventoryId, newStatus, req.user.id);

      await storage.createAuditLog({
        userId: req.user.id,
        action: "START_COUNTING",
        entityType: "INVENTORY",
        entityId: inventoryId.toString(),
        oldValues: { status: inventory.status },
        newValues: { status: newStatus },
        metadata: null,
      });

      res.json({ message: "Counting started successfully", newStatus });
    } catch (error) {
      console.error("Error starting counting:", error);
      res.status(500).json({ message: "Failed to start counting" });
    }
  });

  // Finish counting - closes current counting stage
  app.put("/api/inventories/:id/finish-counting", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const inventoryId = parseInt(req.params.id);

      const inventory = await storage.getInventory(inventoryId);
      if (!inventory) {
        return res.status(404).json({ message: "Inventory not found" });
      }

      let newStatus: string;
      switch (inventory.status) {
        case 'count1_open':
          newStatus = 'count1_closed';
          break;
        case 'count2_open':
          newStatus = 'count2_closed';
          break;
        case 'count3_open':
          newStatus = 'count3_closed';
          break;
        default:
          return res.status(400).json({ message: "Cannot finish counting from current status" });
      }

      await storage.transitionInventoryStatus(inventoryId, newStatus, req.user.id);

      await storage.createAuditLog({
        userId: req.user.id,
        action: "FINISH_COUNTING",
        entityType: "INVENTORY",
        entityId: inventoryId.toString(),
        oldValues: { status: inventory.status },
        newValues: { status: newStatus },
        metadata: null,
      });

      res.json({ message: "Counting finished successfully", newStatus });
    } catch (error) {
      console.error("Error finishing counting:", error);
      res.status(500).json({ message: "Failed to finish counting" });
    }
  });

  // Cancel inventory - changes status to "CANCELLED"
  app.put("/api/inventories/:id/cancel", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const inventoryId = parseInt(req.params.id);
      const { reason } = req.body;

      const inventory = await storage.getInventory(inventoryId);
      if (!inventory) {
        return res.status(404).json({ message: "Inventory not found" });
      }

      await storage.transitionInventoryStatus(inventoryId, 'cancelled', req.user.id);

      // Try to create audit log but don't fail if it errors
      try {
        await storage.createAuditLog({
          userId: req.user.id,
          action: "CANCEL_INVENTORY",
          entityType: "INVENTORY",
          entityId: inventoryId.toString(),
          oldValues: { status: inventory.status },
          newValues: { status: 'cancelled', reason },
          metadata: JSON.stringify({ reason }),
        });
      } catch (auditError) {
        console.warn("Failed to create audit log for inventory cancellation:", auditError);
      }

      res.json({ message: "Inventory cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling inventory:", error);
      res.status(500).json({ message: "Failed to cancel inventory" });
    }
  });

  // Delete cancelled inventory - removes all associated records
  app.delete("/api/inventories/:id", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const inventoryId = parseInt(req.params.id);

      const inventory = await storage.getInventory(inventoryId);
      if (!inventory) {
        return res.status(404).json({ message: "Inventory not found" });
      }

      if (inventory.status !== 'cancelled') {
        return res.status(400).json({ message: "Only cancelled inventories can be deleted" });
      }

      // Delete all associated records
      await storage.deleteInventory(inventoryId);

      // Try to create audit log but don't fail if it errors
      try {
        await storage.createAuditLog({
          userId: req.user.id,
          action: "DELETE_INVENTORY",
          entityType: "INVENTORY",
          entityId: inventoryId.toString(),
          oldValues: JSON.stringify(inventory),
          newValues: undefined,
          metadata: JSON.stringify({ deletedAt: new Date().toISOString() }),
        });
      } catch (auditError) {
        console.warn("Failed to create audit log for inventory deletion:", auditError);
      }

      res.json({ message: "Inventory deleted successfully" });
    } catch (error) {
      console.error("Error deleting inventory:", error);
      res.status(500).json({ message: "Failed to delete inventory" });
    }
  });

  // Fix audit_logs table structure
  app.post("/api/fix-audit-logs-table", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      
      const fixQuery = `
        -- Fix audit_logs table timestamp column type
        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('audit_logs') AND name = 'timestamp' AND system_type_id != 61)
        BEGIN
            -- Drop existing timestamp column if it's not datetime2
            ALTER TABLE audit_logs DROP COLUMN timestamp;
            
            -- Add timestamp column as datetime2
            ALTER TABLE audit_logs ADD timestamp DATETIME2 NOT NULL DEFAULT GETDATE();
        END
        ELSE IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('audit_logs') AND name = 'timestamp')
        BEGIN
            -- Add timestamp column if it doesn't exist
            ALTER TABLE audit_logs ADD timestamp DATETIME2 NOT NULL DEFAULT GETDATE();
        END

        -- Return verification
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'timestamp';
      `;
      
      const result = await storage.pool.request().query(fixQuery);
      res.json({ 
        success: true, 
        message: "Audit logs table structure fixed successfully", 
        columnInfo: result.recordset 
      });
    } catch (error) {
      console.error("Error fixing audit logs table structure:", error);
      res.status(500).json({ 
        message: "Failed to fix audit logs table structure", 
        error: error.message 
      });
    }
  });

  // Database structure update endpoint
  app.post("/api/update-database-structure", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      
      const updateQuery = `
        -- Update inventories table to support new schema fields
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'selectedLocationIds')
        BEGIN
            ALTER TABLE inventories ADD selectedLocationIds NVARCHAR(MAX) NULL;
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'selectedCategoryIds')
        BEGIN
            ALTER TABLE inventories ADD selectedCategoryIds NVARCHAR(MAX) NULL;
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventories') AND name = 'predictedEndDate')
        BEGIN
            ALTER TABLE inventories ADD predictedEndDate DATETIME NULL;
        END

        -- Fix audit_logs table timestamp column type if needed
        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('audit_logs') AND name = 'timestamp' AND system_type_id = 127)
        BEGIN
            ALTER TABLE audit_logs ALTER COLUMN timestamp BIGINT NOT NULL;
        END

        -- Ensure inventory_items table has all required fields
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventory_items') AND name = 'count1')
        BEGIN
            ALTER TABLE inventory_items ADD count1 DECIMAL(18,2) NULL;
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventory_items') AND name = 'count2')
        BEGIN
            ALTER TABLE inventory_items ADD count2 DECIMAL(18,2) NULL;
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventory_items') AND name = 'count3')
        BEGIN
            ALTER TABLE inventory_items ADD count3 DECIMAL(18,2) NULL;
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventory_items') AND name = 'count1By')
        BEGIN
            ALTER TABLE inventory_items ADD count1By NVARCHAR(50) NULL;
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventory_items') AND name = 'count2By')
        BEGIN
            ALTER TABLE inventory_items ADD count2By NVARCHAR(50) NULL;
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventory_items') AND name = 'count3By')
        BEGIN
            ALTER TABLE inventory_items ADD count3By NVARCHAR(50) NULL;
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventory_items') AND name = 'count1At')
        BEGIN
            ALTER TABLE inventory_items ADD count1At DATETIME NULL;
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventory_items') AND name = 'count2At')
        BEGIN
            ALTER TABLE inventory_items ADD count2At DATETIME NULL;
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventory_items') AND name = 'count3At')
        BEGIN
            ALTER TABLE inventory_items ADD count3At DATETIME NULL;
        END

        SELECT 'Database structure updated successfully' as message;
      `;
      
      const result = await storage.pool.request().query(updateQuery);
      res.json({ success: true, message: "Database structure updated successfully", result: result.recordset });
    } catch (error) {
      console.error("Error updating database structure:", error);
      res.status(500).json({ message: "Failed to update database structure", error: error.message });
    }
  });

  // Create inventory snapshot tables
  app.post("/api/create-inventory-snapshot-tables", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      await storage.createInventorySnapshotTables();
      res.json({ message: "Inventory snapshot tables created successfully" });
    } catch (error) {
      console.error("Error creating inventory snapshot tables:", error as Error);
      res.status(500).json({ 
        message: "Failed to create inventory snapshot tables", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Freeze inventory data
  app.post("/api/inventories/:id/freeze", isAuthenticated, async (req: any, res) => {
    try {
      const inventoryId = parseInt(req.params.id);
      const userId = (req.session as any).user?.id || "system";
      
      storage = await getStorage();
      await storage.freezeInventoryData(inventoryId, userId);
      res.json({ message: "Inventory data frozen successfully" });
    } catch (error) {
      console.error("Error freezing inventory data:", error as Error);
      res.status(500).json({ 
        message: "Failed to freeze inventory data", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Unfreeze inventory data
  app.post("/api/inventories/:id/unfreeze", isAuthenticated, async (req: any, res) => {
    try {
      const inventoryId = parseInt(req.params.id);
      const userId = (req.session as any).user?.id || "system";
      
      storage = await getStorage();
      await storage.unfreezeInventoryData(inventoryId, userId);
      res.json({ message: "Inventory data unfrozen successfully" });
    } catch (error) {
      console.error("Error unfreezing inventory data:", error as Error);
      res.status(500).json({ 
        message: "Failed to unfreeze inventory data", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ===== ROTAS PARA VALIDAÇÃO E INTEGRAÇÃO =====

  // Validar integridade do inventário
  app.post("/api/inventories/:id/validate", isAuthenticated, async (req: any, res) => {
    try {
      const inventoryId = parseInt(req.params.id);
      storage = await getStorage();
      
      const { InventoryIntegrityValidator } = await import('./validation');
      const validator = new InventoryIntegrityValidator(storage);
      
      const report = await validator.validateInventoryIntegrity(inventoryId);
      
      await storage.createAuditLog({
        userId: (req.session as any).user?.id || "system",
        action: "VALIDATE_INVENTORY",
        entityType: "inventory",
        entityId: inventoryId.toString(),
        newValues: JSON.stringify({ isValid: report.isValid, issuesCount: report.issues.length }),
      });
      
      res.json(report);
    } catch (error) {
      console.error("Error validating inventory:", error);
      res.status(500).json({ message: "Failed to validate inventory" });
    }
  });

  // Executar reconciliação do inventário
  app.post("/api/inventories/:id/reconcile", isAuthenticated, async (req: any, res) => {
    try {
      const inventoryId = parseInt(req.params.id);
      storage = await getStorage();
      
      // Executar stored procedure de reconciliação
      await storage.reconcileInventory(inventoryId);
      
      await storage.createAuditLog({
        userId: (req.session as any).user?.id || "system",
        action: "RECONCILE_INVENTORY",
        entityType: "inventory",
        entityId: inventoryId.toString(),
        metadata: JSON.stringify({ timestamp: Date.now() }),
      });
      
      res.json({ message: "Reconciliation completed successfully" });
    } catch (error) {
      console.error("Error reconciling inventory:", error);
      res.status(500).json({ message: "Failed to reconcile inventory" });
    }
  });

  // Obter relatório de reconciliação
  app.get("/api/inventories/:id/reconciliation", isAuthenticated, async (req: any, res) => {
    try {
      const inventoryId = parseInt(req.params.id);
      storage = await getStorage();
      
      const { InventoryIntegrityValidator } = await import('./validation');
      const validator = new InventoryIntegrityValidator(storage);
      
      const report = await validator.generateReconciliationReport(inventoryId);
      res.json(report);
    } catch (error) {
      console.error("Error fetching reconciliation report:", error);
      res.status(500).json({ message: "Failed to fetch reconciliation report" });
    }
  });

  // Buscar produtos por termo (SKU ou descrição) - API para combobox dinâmico
  app.get("/api/products/search", isAuthenticated, async (req: any, res) => {
    try {
      const { q, limit = 10 } = req.query;
      
      if (!q || q.length < 2) {
        return res.json([]);
      }
      
      storage = await getStorage();
      const products = await storage.getProducts();
      
      // Filtrar produtos por SKU ou nome (case insensitive)
      const searchTerm = q.toLowerCase();
      const filteredProducts = products
        .filter(p => 
          p.sku?.toLowerCase().includes(searchTerm) || 
          p.name?.toLowerCase().includes(searchTerm)
        )
        .slice(0, parseInt(limit))
        .map(p => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          categoryName: p.category?.name || 'Sem categoria',
          hasSerialControl: p.hasSerialControl || false
        }));
      
      res.json(filteredProducts);
    } catch (error) {
      console.error("Error searching products:", error);
      res.status(500).json({ message: "Failed to search products" });
    }
  });

  // Importar rotas de integração
  const { addIntegrationRoutes } = await import('./routes-integration');
  addIntegrationRoutes(app, getStorage, isAuthenticated);

  // ===== ROTAS PARA CONTROLE DE PATRIMÔNIO POR NÚMERO DE SÉRIE =====

  // Inicializar itens de série para inventário
  app.post("/api/inventories/:id/serial-items/initialize", isAuthenticated, async (req: any, res) => {
    try {
      const inventoryId = parseInt(req.params.id);
      storage = await getStorage();
      await storage.createInventorySerialItems(inventoryId);
      
      await storage.createAuditLog({
        userId: (req.session as any).user?.id || "system",
        action: "INITIALIZE_SERIAL_ITEMS",
        entityType: "inventory",
        entityId: inventoryId.toString(),
        metadata: JSON.stringify({ inventoryId }),
      });
      
      res.json({ message: "Serial items initialized successfully" });
    } catch (error) {
      console.error("Error initializing serial items:", error);
      res.status(500).json({ message: "Failed to initialize serial items" });
    }
  });

  // Registrar leitura de número de série
  app.post("/api/inventories/:id/serial-reading", isAuthenticated, async (req: any, res) => {
    try {
      const inventoryId = parseInt(req.params.id);
      const validatedData = serialReadingRequestSchema.parse(req.body);
      
      storage = await getStorage();
      const result = await storage.registerSerialReading(
        inventoryId, 
        validatedData, 
        (req.session as any).user?.id || "system"
      );
      
      if (result.success) {
        await storage.createAuditLog({
          userId: (req.session as any).user?.id || "system",
          action: "SERIAL_READING",
          entityType: "inventory_serial_item",
          entityId: `${inventoryId}-${validatedData.serialNumber}`,
          newValues: JSON.stringify(validatedData),
          metadata: JSON.stringify({ productId: result.productId }),
        });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error registering serial reading:", error);
      res.status(500).json({ message: "Failed to register serial reading" });
    }
  });

  // Buscar produto por número de série
  app.get("/api/products/by-serial/:serial", isAuthenticated, async (req: any, res) => {
    try {
      const serialNumber = req.params.serial;
      storage = await getStorage();
      const product = await storage.findProductBySerial(serialNumber);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found for this serial number" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error finding product by serial:", error);
      res.status(500).json({ message: "Failed to find product" });
    }
  });

  // Listar itens de série do inventário
  app.get("/api/inventories/:id/serial-items", isAuthenticated, async (req: any, res) => {
    try {
      const inventoryId = parseInt(req.params.id);
      const productId = req.query.productId ? parseInt(req.query.productId as string) : undefined;
      
      storage = await getStorage();
      const items = productId 
        ? await storage.getInventorySerialItemsByProduct(inventoryId, productId)
        : await storage.getInventorySerialItems(inventoryId);
        
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory serial items:", error);
      res.status(500).json({ message: "Failed to fetch serial items" });
    }
  });

  // Atualizar item de série
  app.put("/api/inventory-serial-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const updateData = req.body;
      
      storage = await getStorage();
      const updatedItem = await storage.updateInventorySerialItem(itemId, updateData);
      
      await storage.createAuditLog({
        userId: (req.session as any).user?.id || "system",
        action: "UPDATE_SERIAL_ITEM",
        entityType: "inventory_serial_item",
        entityId: itemId.toString(),
        newValues: JSON.stringify(updateData),
      });
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating serial item:", error);
      res.status(500).json({ message: "Failed to update serial item" });
    }
  });

  // Reconciliação de quantidades
  app.post("/api/inventories/:id/reconcile", isAuthenticated, async (req: any, res) => {
    try {
      const inventoryId = parseInt(req.params.id);
      storage = await getStorage();
      await storage.reconcileInventoryQuantities(inventoryId);
      
      const reconciliation = await storage.getInventoryReconciliation(inventoryId);
      
      await storage.createAuditLog({
        userId: (req.session as any).user?.id || "system",
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
  });

  // Buscar dados de reconciliação
  app.get("/api/inventories/:id/reconciliation", isAuthenticated, async (req: any, res) => {
    try {
      const inventoryId = parseInt(req.params.id);
      storage = await getStorage();
      const reconciliation = await storage.getInventoryReconciliation(inventoryId);
      res.json(reconciliation);
    } catch (error) {
      console.error("Error fetching reconciliation data:", error);
      res.status(500).json({ message: "Failed to fetch reconciliation data" });
    }
  });

  // Buscar histórico de número de série
  app.get("/api/serial-history/:serial", isAuthenticated, async (req: any, res) => {
    try {
      const serialNumber = req.params.serial;
      storage = await getStorage();
      const history = await storage.getSerialHistory(serialNumber);
      res.json(history);
    } catch (error) {
      console.error("Error fetching serial history:", error);
      res.status(500).json({ message: "Failed to fetch serial history" });
    }
  });

  // Validar se número de série existe
  app.get("/api/validate-serial/:serial", isAuthenticated, async (req: any, res) => {
    try {
      const serialNumber = req.params.serial;
      storage = await getStorage();
      const exists = await storage.validateSerialExists(serialNumber);
      res.json({ exists, serialNumber });
    } catch (error) {
      console.error("Error validating serial:", error);
      res.status(500).json({ message: "Failed to validate serial number" });
    }
  });

  // ===== ROTAS PARA PRODUTOS COM CONTROLE DE SÉRIE =====

  // Listar produtos com controle de série
  app.get("/api/products/with-serial-control", isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const products = await storage.getProductsWithSerialControl();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products with serial control:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Atualizar controle de série do produto
  app.put("/api/products/:id/serial-control", isAuthenticated, async (req: any, res) => {
    try {
      const productId = parseInt(req.params.id);
      const validatedData = updateProductSerialControlSchema.parse(req.body);
      
      storage = await getStorage();
      await storage.updateProductSerialControl(productId, validatedData.hasSerialControl);
      
      await storage.createAuditLog({
        userId: (req.session as any).user?.id || "system",
        action: "UPDATE_SERIAL_CONTROL",
        entityType: "product",
        entityId: productId.toString(),
        newValues: JSON.stringify(validatedData),
      });
      
      res.json({ message: "Serial control updated successfully" });
    } catch (error) {
      console.error("Error updating serial control:", error);
      res.status(500).json({ message: "Failed to update serial control" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
