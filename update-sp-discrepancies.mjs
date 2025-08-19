import sql from 'mssql';
import fs from 'fs';
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

        // Ler o arquivo SQL
        const sqlScript = fs.readFileSync('sql/serial-discrepancies-schema.sql', 'utf8');
        
        // Dividir o script em comandos individuais
        const commands = sqlScript.split('GO').filter(cmd => cmd.trim().length > 0);
        
        console.log(`Executando ${commands.length} comandos...`);
        
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i].trim();
            if (command) {
                try {
                    console.log(`Executando comando ${i + 1}/${commands.length}...`);
                    await sql.query(command);
                    console.log(`Comando ${i + 1} executado com sucesso`);
                } catch (error) {
                    console.error(`Erro no comando ${i + 1}:`, error.message);
                    // Continue com os próximos comandos mesmo se houver erro
                }
            }
        }
        
        console.log('\nTodos os comandos foram processados!');
        
    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await sql.close();
    }
}

updateStoredProcedure();