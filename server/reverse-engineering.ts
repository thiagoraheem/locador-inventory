import { sql } from 'mssql';
import { SimpleStorage } from './simple-storage';

interface TableInfo {
  tableName: string;
  tableType: string;
}

interface ColumnInfo {
  columnName: string;
  dataType: string;
  isNullable: string;
  maxLength: number | null;
}

export async function analyzeDatabaseStructure() {
  try {
    const storage = new SimpleStorage();
    await storage.init();
    const pool = (storage as any).pool;

    // Get all tables and views
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME as tableName, TABLE_TYPE as tableType 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' 
      ORDER BY TABLE_TYPE, TABLE_NAME
    `);

    console.log('\n=== TABELAS E VIEWS DISPONÍVEIS ===');
    for (const table of tablesResult.recordset) {
      console.log(`${table.tableType}: ${table.tableName}`);
    }

    // Analyze specific views/tables
    const targetTables = ['products', 'categories', 'locations', 'companies', 'stock_items', 'stock'];

    for (const tableName of targetTables) {
      try {
        const columnsResult = await pool.request().query(`
          SELECT 
            COLUMN_NAME as columnName,
            DATA_TYPE as dataType,
            IS_NULLABLE as isNullable,
            CHARACTER_MAXIMUM_LENGTH as maxLength
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = '${tableName}' 
          ORDER BY ORDINAL_POSITION
        `);

        if (columnsResult.recordset.length > 0) {
          console.log(`\n=== ESTRUTURA DA ${tableName.toUpperCase()} ===`);
          for (const column of columnsResult.recordset) {
            console.log(`  ${column.columnName}: ${column.dataType}${column.maxLength ? `(${column.maxLength})` : ''} ${column.isNullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
          }

          // Get sample data
          const sampleResult = await pool.request().query(`SELECT TOP 3 * FROM ${tableName}`);
          if (sampleResult.recordset.length > 0) {
            console.log(`\n=== DADOS DE EXEMPLO (${tableName.toUpperCase()}) ===`);
            console.log(JSON.stringify(sampleResult.recordset[0], null, 2));
          }
        }
      } catch (error) {
        console.log(`${tableName}: Não encontrada ou sem acesso`);
      }
    }

  } catch (error) {
    console.error('Erro na análise:', error);
  }
}

// Execute analysis if run directly
if (require.main === module) {
  analyzeDatabaseStructure();
}