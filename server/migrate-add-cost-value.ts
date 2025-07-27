
import { getStorage } from "./db";

export async function addCostValueColumn() {
  try {
    console.log('🔄 Adding costValue column to products table...');
    
    const storage = await getStorage();
    
    // Add the costValue column if it doesn't exist
    await storage.db.run(`
      ALTER TABLE products 
      ADD COLUMN cost_value REAL DEFAULT NULL
    `);
    
    console.log('✅ Successfully added costValue column to products table');
    
  } catch (error) {
    // Column might already exist, check if that's the case
    if (error.message && error.message.includes('duplicate column name')) {
      console.log('ℹ️ costValue column already exists in products table');
    } else {
      console.error('❌ Error adding costValue column:', error);
      throw error;
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  addCostValueColumn()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
