import type { Express } from "express";
import { createServer, type Server } from "http";
import { getStorage } from "./db";
import { setupAuth, isAuthenticated, hashPassword, verifyPassword, createDefaultAdmin } from "./auth";
import {
  insertProductSchema,
  insertCategorySchema,
  insertLocationSchema,
  insertStockSchema,
  insertInventorySchema,
  insertInventoryTypeSchema,
  insertCountSchema,
  loginSchema,
  registerSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Initialize SQL Server storage
  let storage = await getStorage();

  // Database setup endpoint
  app.post('/api/setup-sqlserver', async (req, res) => {
    try {
      console.log('🔧 Setting up SQL Server database...');
      const { setupSqlServerDatabase } = await import('./setup-sqlserver');
      await setupSqlServerDatabase();
      res.json({ message: "SQL Server database setup completed successfully" });
    } catch (error) {
      console.error("Error setting up SQL Server:", error as Error);
      res.status(500).json({ error: "Failed to setup SQL Server database", details: (error as Error).message });
    }
  });

  // Database test endpoint
  app.get('/api/test-database', async (req, res) => {
    try {
      console.log('🔍 Testing SQL Server connection...');
      const { testSqlServerConnection } = await import('./setup-sqlserver');
      const connected = await testSqlServerConnection();
      
      if (connected) {
        storage = await getStorage();
        const stats = await storage.getDashboardStats();
        console.log('📊 Database stats:', stats);
        
        res.json({
          connected: true,
          stats,
          message: 'SQL Server connection successful'
        });
      } else {
        res.status(500).json({ error: "SQL Server connection failed" });
      }
    } catch (error) {
      console.error("SQL Server connection error:", error as Error);
      res.status(500).json({ error: "Database connection failed", details: (error as Error).message });
    }
  });

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
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

  app.post('/api/auth/register', async (req, res) => {
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
        role: 'user',
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

  app.post('/api/auth/logout', (req, res) => {
    const session = req.session as any;
    session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const { password: _, ...userWithoutPassword } = req.user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
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
  app.get('/api/categories', isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/categories', isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const category = await storage.createCategory(req.body);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error as Error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.put('/api/categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const category = await storage.updateCategory(parseInt(req.params.id), req.body);
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error as Error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete('/api/categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      await storage.deleteCategory(parseInt(req.params.id));
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error as Error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Product routes
  app.get('/api/products', isAuthenticated, async (req, res) => {
    try {
      storage = await getStorage();
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error as Error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/:id', isAuthenticated, async (req, res) => {
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

  app.post('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'CREATE',
        entityType: 'PRODUCT',
        entityId: product.id.toString(),
        oldValues: null,
        newValues: productData,
        metadata: null,
      });
      
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error as Error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const oldProduct = await storage.getProduct(id);
      if (!oldProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(id, productData);
      
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'UPDATE',
        entityType: 'PRODUCT',
        entityId: id.toString(),
        oldValues: oldProduct,
        newValues: productData,
        metadata: null,
      });
      
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error as Error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const oldProduct = await storage.getProduct(id);
      if (!oldProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      await storage.deleteProduct(id);
      
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'DELETE',
        entityType: 'PRODUCT',
        entityId: id.toString(),
        oldValues: oldProduct,
        newValues: null,
        metadata: null,
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error as Error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Location routes
  app.get('/api/locations', isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const locations = await storage.getLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error as Error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.post('/api/locations', isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const locationData = insertLocationSchema.parse(req.body);
      const location = await storage.createLocation(locationData);
      
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'CREATE',
        entityType: 'LOCATION',
        entityId: location.id.toString(),
        oldValues: null,
        newValues: locationData,
        metadata: null,
      });
      
      res.status(201).json(location);
    } catch (error) {
      console.error("Error creating location:", error as Error);
      res.status(500).json({ message: "Failed to create location" });
    }
  });

  app.put('/api/locations/:id', isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const id = parseInt(req.params.id);
      const oldLocation = await storage.getLocation(id);
      if (!oldLocation) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      const locationData = insertLocationSchema.partial().parse(req.body);
      const location = await storage.updateLocation(id, locationData);
      
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'UPDATE',
        entityType: 'LOCATION',
        entityId: id.toString(),
        oldValues: oldLocation,
        newValues: locationData,
        metadata: null,
      });
      
      res.json(location);
    } catch (error) {
      console.error("Error updating location:", error as Error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  app.delete('/api/locations/:id', isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const id = parseInt(req.params.id);
      const oldLocation = await storage.getLocation(id);
      if (!oldLocation) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      await storage.deleteLocation(id);
      
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'DELETE',
        entityType: 'LOCATION',
        entityId: id.toString(),
        oldValues: oldLocation,
        newValues: null,
        metadata: null,
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting location:", error as Error);
      res.status(500).json({ message: "Failed to delete location" });
    }
  });

  // Stock routes
  app.get('/api/stock', isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const stock = await storage.getStock();
      res.json(stock);
    } catch (error) {
      console.error("Error fetching stock:", error as Error);
      res.status(500).json({ message: "Failed to fetch stock" });
    }
  });

  app.post('/api/stock', isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const stockData = insertStockSchema.parse(req.body);
      const stock = await storage.createStock(stockData);
      
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'CREATE',
        entityType: 'STOCK',
        entityId: stock.id.toString(),
        oldValues: null,
        newValues: stockData,
        metadata: null,
      });
      
      res.status(201).json(stock);
    } catch (error) {
      console.error("Error creating stock:", error as Error);
      res.status(500).json({ message: "Failed to create stock" });
    }
  });

  app.put('/api/stock/:id', isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const id = parseInt(req.params.id);
      const oldStock = await storage.getStockItem(id);
      if (!oldStock) {
        return res.status(404).json({ message: "Stock item not found" });
      }
      
      const stockData = insertStockSchema.partial().parse(req.body);
      const stock = await storage.updateStock(id, stockData);
      
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'UPDATE',
        entityType: 'STOCK',
        entityId: id.toString(),
        oldValues: oldStock,
        newValues: stockData,
        metadata: null,
      });
      
      res.json(stock);
    } catch (error) {
      console.error("Error updating stock:", error as Error);
      res.status(500).json({ message: "Failed to update stock" });
    }
  });

  // Inventory routes
  app.get('/api/inventory-types', isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const types = await storage.getInventoryTypes();
      res.json(types);
    } catch (error) {
      console.error("Error fetching inventory types:", error as Error);
      res.status(500).json({ message: "Failed to fetch inventory types" });
    }
  });

  app.get('/api/inventories', isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const inventories = await storage.getInventories();
      res.json(inventories);
    } catch (error) {
      console.error("Error fetching inventories:", error as Error);
      res.status(500).json({ message: "Failed to fetch inventories" });
    }
  });

  app.get('/api/inventories/:id', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/inventories', isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      // Convert date strings to Date objects before validation
      const bodyWithDates = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        createdBy: req.user.id,
      };
      
      const inventoryData = insertInventorySchema.parse(bodyWithDates);
      
      const inventory = await storage.createInventory(inventoryData);
      
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'CREATE',
        entityType: 'INVENTORY',
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

  app.put('/api/inventories/:id', isAuthenticated, async (req: any, res) => {
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
        action: 'UPDATE',
        entityType: 'INVENTORY',
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

  app.post('/api/inventories/:id/close', isAuthenticated, async (req: any, res) => {
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
        action: 'CLOSE',
        entityType: 'INVENTORY',
        entityId: id.toString(),
        oldValues: oldInventory,
        newValues: { status: 'CLOSED' },
        metadata: null,
      });
      
      res.json({ message: "Inventory closed successfully" });
    } catch (error) {
      console.error("Error closing inventory:", error as Error);
      res.status(500).json({ message: "Failed to close inventory" });
    }
  });

  // Inventory items routes
  app.get('/api/inventories/:id/items', isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const items = await storage.getInventoryItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory items:", error as Error);
      res.status(500).json({ message: "Failed to fetch inventory items" });
    }
  });

  // Count routes
  app.get('/api/inventory-items/:id/counts', isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const counts = await storage.getCounts();
      res.json(counts);
    } catch (error) {
      console.error("Error fetching counts:", error as Error);
      res.status(500).json({ message: "Failed to fetch counts" });
    }
  });

  app.post('/api/counts', isAuthenticated, async (req: any, res) => {
    try {
      storage = await getStorage();
      const countData = insertCountSchema.parse({
        ...req.body,
        countedBy: req.user.id,
      });
      
      const count = await storage.createCount(countData);
      
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'CREATE',
        entityType: 'COUNT',
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
  app.get('/api/audit-logs', isAuthenticated, async (req, res) => {
    try {
      const { limit, offset } = req.query;
      const logs = await storage.getAuditLogs(
        limit ? parseInt(limit as string) : undefined,
        offset ? parseInt(offset as string) : undefined
      );
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
