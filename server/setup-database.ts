
import { db } from "./db";
import { hashPassword } from "./auth";
import { users, categories, locations, inventoryTypes } from "@shared/schema";

export async function setupDatabase() {
  try {
    console.log('🔄 Setting up database...');

    // Clear existing data (careful - this deletes everything)
    console.log('🗑️ Clearing existing data...');
    await db.delete(users);
    await db.delete(categories);
    await db.delete(locations);
    await db.delete(inventoryTypes);

    // Create admin user
    console.log('👤 Creating admin user...');
    const hashedPassword = await hashPassword('admin123');
    const adminUser = await db.insert(users).values({
      id: 'admin-' + Date.now(),
      username: 'admin',
      email: 'admin@inventory.com',
      password: hashedPassword,
      firstName: 'Administrator',
      lastName: 'User',
      role: 'admin',
      isActive: true,
    }).returning();

    console.log('✅ Admin user created:', {
      id: adminUser[0].id,
      username: adminUser[0].username,
      email: adminUser[0].email,
      role: adminUser[0].role
    });

    // Create default categories
    console.log('📂 Creating default categories...');
    await db.insert(categories).values([
      {
        name: 'Geral',
        description: 'Categoria geral para produtos',
        isActive: true,
      },
      {
        name: 'Eletrônicos',
        description: 'Produtos eletrônicos',
        isActive: true,
      },
      {
        name: 'Escritório',
        description: 'Material de escritório',
        isActive: true,
      }
    ]);

    // Create default locations
    console.log('📍 Creating default locations...');
    await db.insert(locations).values([
      {
        code: 'EST001',
        name: 'Estoque Principal',
        description: 'Estoque principal da empresa',
        isActive: true,
      },
      {
        code: 'EST002',
        name: 'Estoque Secundário',
        description: 'Estoque secundário',
        isActive: true,
      }
    ]);

    // Create default inventory types
    console.log('📋 Creating default inventory types...');
    await db.insert(inventoryTypes).values([
      {
        name: 'Mensal',
        description: 'Inventário mensal',
        isActive: true,
      },
      {
        name: 'Anual',
        description: 'Inventário anual',
        isActive: true,
      },
      {
        name: 'Especial',
        description: 'Inventário especial',
        isActive: true,
      }
    ]);

    console.log('✅ Database setup completed successfully!');
    console.log('🔑 Admin credentials: admin / admin123');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    throw error;
  }
}
