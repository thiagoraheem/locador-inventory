import sql from 'mssql';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function updateStoredProcedure() {
    try {
        console.log('Conectando ao banco de dados...');
        await sql.connect(config);
        console.log('Conectado com sucesso!');

        // Primeiro, remover a procedure existente
        console.log('Removendo procedure existente...');
        await sql.query(`
            IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_ProcessSerialDiscrepancies')
            BEGIN
                DROP PROCEDURE sp_ProcessSerialDiscrepancies;
                PRINT 'Procedure sp_ProcessSerialDiscrepancies removida para recriação';
            END
        `);
        
        // Criar a nova procedure com a lógica corrigida
        console.log('Criando nova procedure...');
        await sql.query(`
            CREATE PROCEDURE sp_ProcessSerialDiscrepancies
                @InventoryId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                
                -- Limpar divergências existentes para este inventário
                DELETE FROM inventory_serial_discrepancies WHERE inventoryId = @InventoryId;
                
                -- 1. NÚMEROS DE SÉRIE ENCONTRADOS EM LOCAIS DIFERENTES DOS ESPERADOS
                INSERT INTO inventory_serial_discrepancies (
                    inventoryId, serialNumber, productId, productSku, productName,
                    expectedLocationId, expectedLocationCode, expectedLocationName,
                    foundLocationId, foundLocationCode, foundLocationName,
                    discrepancyType, foundBy, foundAt, countStage
                )
                SELECT 
                    isi_found.inventoryId,
                    isi_found.serialNumber,
                    isi_found.productId,
                    p.sku,
                    p.name,
                    -- Local esperado (onde deveria estar - baseado no inventory_serial_items com expectedStatus = 1)
                    isi_expected.locationId,
                    l_expected.code,
                    l_expected.name,
                    -- Local encontrado (onde foi encontrado)
                    isi_found.locationId,
                    l_found.code,
                    l_found.name,
                    'LOCATION_MISMATCH',
                    CASE 
                        WHEN isi_found.count1_found = 1 THEN isi_found.count1_by
                        WHEN isi_found.count2_found = 1 THEN isi_found.count2_by
                        WHEN isi_found.count3_found = 1 THEN isi_found.count3_by
                        WHEN isi_found.count4_found = 1 THEN isi_found.count4_by
                    END,
                    CASE 
                        WHEN isi_found.count1_found = 1 THEN isi_found.count1_at
                        WHEN isi_found.count2_found = 1 THEN isi_found.count2_at
                        WHEN isi_found.count3_found = 1 THEN isi_found.count3_at
                        WHEN isi_found.count4_found = 1 THEN isi_found.count4_at
                    END,
                    CASE 
                        WHEN isi_found.count1_found = 1 THEN 'count1'
                        WHEN isi_found.count2_found = 1 THEN 'count2'
                        WHEN isi_found.count3_found = 1 THEN 'count3'
                        WHEN isi_found.count4_found = 1 THEN 'count4'
                    END
                FROM inventory_serial_items isi_found
                JOIN products p ON isi_found.productId = p.id
                JOIN inventory_serial_items isi_expected ON isi_found.serialNumber = isi_expected.serialNumber 
                    AND isi_found.inventoryId = isi_expected.inventoryId 
                    AND isi_expected.expectedStatus = 1
                JOIN locations l_expected ON isi_expected.locationId = l_expected.id
                JOIN locations l_found ON isi_found.locationId = l_found.id
                WHERE isi_found.inventoryId = @InventoryId
                AND isi_found.finalStatus = 1
                AND isi_expected.locationId != isi_found.locationId; -- Encontrado em local diferente do esperado
                
                -- 2. NÚMEROS DE SÉRIE ESPERADOS QUE NÃO FORAM ENCONTRADOS
                INSERT INTO inventory_serial_discrepancies (
                    inventoryId, serialNumber, productId, productSku, productName,
                    expectedLocationId, expectedLocationCode, expectedLocationName,
                    discrepancyType
                )
                SELECT 
                    isi.inventoryId,
                    isi.serialNumber,
                    isi.productId,
                    p.sku,
                    p.name,
                    isi.locationId, -- Local esperado baseado no inventory_serial_items
                    l.code,
                    l.name,
                    'NOT_FOUND'
                FROM inventory_serial_items isi
                JOIN products p ON isi.productId = p.id
                JOIN locations l ON isi.locationId = l.id
                WHERE isi.inventoryId = @InventoryId
                AND isi.expectedStatus = 1 -- Deveria estar presente
                AND isi.status = 'PENDING'; -- Não foi encontrado
                
                -- 3. NÚMEROS DE SÉRIE ENCONTRADOS QUE NÃO ERAM ESPERADOS
                INSERT INTO inventory_serial_discrepancies (
                    inventoryId, serialNumber, productId, productSku, productName,
                    foundLocationId, foundLocationCode, foundLocationName,
                    discrepancyType, foundBy, foundAt, countStage
                )
                SELECT 
                    isi.inventoryId,
                    isi.serialNumber,
                    isi.productId,
                    p.sku,
                    p.name,
                    isi.locationId,
                    l.code,
                    l.name,
                    'UNEXPECTED_FOUND',
                    CASE 
                        WHEN isi.count1_found = 1 THEN isi.count1_by
                        WHEN isi.count2_found = 1 THEN isi.count2_by
                        WHEN isi.count3_found = 1 THEN isi.count3_by
                        WHEN isi.count4_found = 1 THEN isi.count4_by
                    END,
                    CASE 
                        WHEN isi.count1_found = 1 THEN isi.count1_at
                        WHEN isi.count2_found = 1 THEN isi.count2_at
                        WHEN isi.count3_found = 1 THEN isi.count3_at
                        WHEN isi.count4_found = 1 THEN isi.count4_at
                    END,
                    CASE 
                        WHEN isi.count1_found = 1 THEN 'count1'
                        WHEN isi.count2_found = 1 THEN 'count2'
                        WHEN isi.count3_found = 1 THEN 'count3'
                        WHEN isi.count4_found = 1 THEN 'count4'
                    END
                FROM inventory_serial_items isi
                JOIN products p ON isi.productId = p.id
                JOIN locations l ON isi.locationId = l.id
                WHERE isi.inventoryId = @InventoryId
                AND isi.expectedStatus = 0 -- Não deveria estar presente
                AND isi.status = 'FOUND'; -- Mas foi encontrado
                
                -- Retornar estatísticas
                SELECT 
                    COUNT(*) as totalDiscrepancies,
                    SUM(CASE WHEN discrepancyType = 'LOCATION_MISMATCH' THEN 1 ELSE 0 END) as locationMismatches,
                    SUM(CASE WHEN discrepancyType = 'NOT_FOUND' THEN 1 ELSE 0 END) as notFound,
                    SUM(CASE WHEN discrepancyType = 'UNEXPECTED_FOUND' THEN 1 ELSE 0 END) as unexpectedFound
                FROM inventory_serial_discrepancies
                WHERE inventoryId = @InventoryId;
            END
        `);
        
        console.log('Procedure sp_ProcessSerialDiscrepancies criada com sucesso!');
        
    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await sql.close();
    }
}

updateStoredProcedure();