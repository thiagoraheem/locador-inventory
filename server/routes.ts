import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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

  // Database setup endpoint (temporary - for development)
  app.post('/api/setup-database', async (req, res) => {
    try {
      const { setupDatabase } = await import('./setup-database');
      await setupDatabase();
      res.json({ message: "Database setup completed successfully" });
    } catch (error) {
      console.error("Error setting up database:", error);
      res.status(500).json({ error: "Failed to setup database" });
    }
  });

  // Database test endpoint
  app.get('/api/test-database', async (req, res) => {
    try {
      console.log('🔍 Testing database connection...');
      const users = await storage.getUsers();
      console.log('📊 Users found:', users.length);
      
      const adminUser = await storage.getUserByUsername('admin');
      console.log('👤 Admin user:', adminUser ? 'FOUND' : 'NOT FOUND');
      
      if (adminUser) {
        console.log('🔐 Admin password hash:', adminUser.password.substring(0, 20) + '...');
        const passwordTest = await verifyPassword('password', adminUser.password);
        console.log('🔐 Password test with "password":', passwordTest ? 'VALID' : 'INVALID');
        const passwordTest2 = await verifyPassword('admin123', adminUser.password);
        console.log('🔐 Password test with "admin123":', passwordTest2 ? 'VALID' : 'INVALID');
      }
      
      res.json({
        connected: true,
        usersCount: users.length,
        adminExists: !!adminUser,
        adminPasswordValid: adminUser ? await verifyPassword('admin123', adminUser.password) : false
      });
    } catch (error) {
      console.error("Database test error:", error);
      res.status(500).json({ error: "Database test failed", details: error.message });
    }
  });

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
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
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/categories', isAuthenticated, async (req: any, res) => {
    try {
      const category = await storage.createCategory(req.body);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.put('/api/categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const category = await storage.updateCategory(parseInt(req.params.id), req.body);
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete('/api/categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteCategory(parseInt(req.params.id));
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Product routes
  app.get('/api/products', isAuthenticated, async (req, res) => {
    try {
      const { search, limit, offset, includeInactive } = req.query;
      const products = await storage.getProducts(
        search as string,
        limit ? parseInt(limit as string) : undefined,
        offset ? parseInt(offset as string) : undefined,
        includeInactive === 'true'
      );
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'CREATE',
        entityType: 'PRODUCT',
        entityId: product.id.toString(),
        newValues: productData,
        metadata: null,
      });
      
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
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
        userId: req.user.claims.sub,
        action: 'UPDATE',
        entityType: 'PRODUCT',
        entityId: id.toString(),
        oldValues: oldProduct,
        newValues: productData,
        metadata: null,
      });
      
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
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
        userId: req.user.claims.sub,
        action: 'DELETE',
        entityType: 'PRODUCT',
        entityId: id.toString(),
        oldValues: oldProduct,
        newValues: null,
        metadata: null,
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Location routes
  app.get('/api/locations', isAuthenticated, async (req, res) => {
    try {
      const { search } = req.query;
      const locations = await storage.getLocations(search as string);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.post('/api/locations', isAuthenticated, async (req: any, res) => {
    try {
      const locationData = insertLocationSchema.parse(req.body);
      const location = await storage.createLocation(locationData);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'CREATE',
        entityType: 'LOCATION',
        entityId: location.id.toString(),
        newValues: locationData,
        metadata: null,
      });
      
      res.status(201).json(location);
    } catch (error) {
      console.error("Error creating location:", error);
      res.status(500).json({ message: "Failed to create location" });
    }
  });

  app.put('/api/locations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const oldLocation = await storage.getLocation(id);
      if (!oldLocation) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      const locationData = insertLocationSchema.partial().parse(req.body);
      const location = await storage.updateLocation(id, locationData);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'UPDATE',
        entityType: 'LOCATION',
        entityId: id.toString(),
        oldValues: oldLocation,
        newValues: locationData,
        metadata: null,
      });
      
      res.json(location);
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  app.delete('/api/locations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const oldLocation = await storage.getLocation(id);
      if (!oldLocation) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      await storage.deleteLocation(id);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'DELETE',
        entityType: 'LOCATION',
        entityId: id.toString(),
        oldValues: oldLocation,
        newValues: null,
        metadata: null,
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting location:", error);
      res.status(500).json({ message: "Failed to delete location" });
    }
  });

  // Stock routes
  app.get('/api/stock', isAuthenticated, async (req, res) => {
    try {
      const { productId, locationId } = req.query;
      const stock = await storage.getStock(
        productId ? parseInt(productId as string) : undefined,
        locationId ? parseInt(locationId as string) : undefined
      );
      res.json(stock);
    } catch (error) {
      console.error("Error fetching stock:", error);
      res.status(500).json({ message: "Failed to fetch stock" });
    }
  });

  app.post('/api/stock', isAuthenticated, async (req: any, res) => {
    try {
      const stockData = insertStockSchema.parse(req.body);
      const stock = await storage.createStock(stockData);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'CREATE',
        entityType: 'STOCK',
        entityId: stock.id.toString(),
        newValues: stockData,
        metadata: null,
      });
      
      res.status(201).json(stock);
    } catch (error) {
      console.error("Error creating stock:", error);
      res.status(500).json({ message: "Failed to create stock" });
    }
  });

  app.put('/api/stock/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const oldStock = await storage.getStockItem(id);
      if (!oldStock) {
        return res.status(404).json({ message: "Stock item not found" });
      }
      
      const stockData = insertStockSchema.partial().parse(req.body);
      const stock = await storage.updateStock(id, stockData);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'UPDATE',
        entityType: 'STOCK',
        entityId: id.toString(),
        oldValues: oldStock,
        newValues: stockData,
        metadata: null,
      });
      
      res.json(stock);
    } catch (error) {
      console.error("Error updating stock:", error);
      res.status(500).json({ message: "Failed to update stock" });
    }
  });

  // Inventory routes
  app.get('/api/inventory-types', isAuthenticated, async (req, res) => {
    try {
      const types = await storage.getInventoryTypes();
      res.json(types);
    } catch (error) {
      console.error("Error fetching inventory types:", error);
      res.status(500).json({ message: "Failed to fetch inventory types" });
    }
  });

  app.get('/api/inventories', isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      const inventories = await storage.getInventories(status as string);
      res.json(inventories);
    } catch (error) {
      console.error("Error fetching inventories:", error);
      res.status(500).json({ message: "Failed to fetch inventories" });
    }
  });

  app.get('/api/inventories/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const inventory = await storage.getInventory(id);
      if (!inventory) {
        return res.status(404).json({ message: "Inventory not found" });
      }
      res.json(inventory);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.post('/api/inventories', isAuthenticated, async (req: any, res) => {
    try {
      // Convert date strings to Date objects before validation
      const bodyWithDates = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        createdBy: req.user.claims.sub,
      };
      
      const inventoryData = insertInventorySchema.parse(bodyWithDates);
      
      const inventory = await storage.createInventory(inventoryData);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'CREATE',
        entityType: 'INVENTORY',
        entityId: inventory.id.toString(),
        newValues: inventoryData,
        metadata: null,
      });
      
      res.status(201).json(inventory);
    } catch (error) {
      console.error("Error creating inventory:", error);
      res.status(500).json({ message: "Failed to create inventory" });
    }
  });

  app.put('/api/inventories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const oldInventory = await storage.getInventory(id);
      if (!oldInventory) {
        return res.status(404).json({ message: "Inventory not found" });
      }
      
      const inventoryData = insertInventorySchema.partial().parse(req.body);
      const inventory = await storage.updateInventory(id, inventoryData);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'UPDATE',
        entityType: 'INVENTORY',
        entityId: id.toString(),
        oldValues: oldInventory,
        newValues: inventoryData,
        metadata: null,
      });
      
      res.json(inventory);
    } catch (error) {
      console.error("Error updating inventory:", error);
      res.status(500).json({ message: "Failed to update inventory" });
    }
  });

  app.post('/api/inventories/:id/close', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.closeInventory(id);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'CLOSE',
        entityType: 'INVENTORY',
        entityId: id.toString(),
        newValues: { status: 'CLOSED' },
        metadata: null,
      });
      
      res.json({ message: "Inventory closed successfully" });
    } catch (error) {
      console.error("Error closing inventory:", error);
      res.status(500).json({ message: "Failed to close inventory" });
    }
  });

  // Inventory items routes
  app.get('/api/inventories/:id/items', isAuthenticated, async (req, res) => {
    try {
      const inventoryId = parseInt(req.params.id);
      const items = await storage.getInventoryItems(inventoryId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      res.status(500).json({ message: "Failed to fetch inventory items" });
    }
  });

  // Count routes
  app.get('/api/inventory-items/:id/counts', isAuthenticated, async (req, res) => {
    try {
      const inventoryItemId = parseInt(req.params.id);
      const counts = await storage.getCounts(inventoryItemId);
      res.json(counts);
    } catch (error) {
      console.error("Error fetching counts:", error);
      res.status(500).json({ message: "Failed to fetch counts" });
    }
  });

  app.post('/api/counts', isAuthenticated, async (req: any, res) => {
    try {
      const countData = insertCountSchema.parse({
        ...req.body,
        countedBy: req.user.claims.sub,
      });
      
      const count = await storage.createCount(countData);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'CREATE',
        entityType: 'COUNT',
        entityId: count.id.toString(),
        newValues: countData,
        metadata: null,
      });
      
      res.status(201).json(count);
    } catch (error) {
      console.error("Error creating count:", error);
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
