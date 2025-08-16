// Script de teste para validar a correção do registro de serial em local diferente
// Este script testa se o sistema está criando registros corretos na tabela inventory_items

const http = require('http');
const { URL } = require('url');

const BASE_URL = 'http://localhost:5401/api';

// Função auxiliar para fazer requisições HTTP
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ data: jsonData, status: res.statusCode });
          } else {
            reject({ response: { data: jsonData, status: res.statusCode } });
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ data: body, status: res.statusCode });
          } else {
            reject({ response: { data: body, status: res.statusCode } });
          }
        }
      });
    });

    req.on('error', (err) => {
      reject({ message: err.message });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Função para testar o registro de serial em local diferente
async function testSerialLocationFix() {
  try {
    console.log('🧪 Iniciando teste de correção de local de serial...');
    
    // 1. Buscar inventários disponíveis
    console.log('\n1. Buscando inventários...');
    const inventoriesResponse = await makeRequest(`${BASE_URL}/inventories`);
    const inventories = inventoriesResponse.data;
    
    if (inventories.length === 0) {
      console.log('❌ Nenhum inventário encontrado');
      return;
    }
    
    const inventory = inventories[0];
    console.log(`✅ Inventário encontrado: ${inventory.code} (ID: ${inventory.id})`);
    
    // 2. Buscar itens de série do inventário
    console.log('\n2. Buscando itens de série...');
    const serialItemsResponse = await makeRequest(`${BASE_URL}/inventories/${inventory.id}/serial-items`);
    const serialItems = serialItemsResponse.data;
    
    if (serialItems.length === 0) {
      console.log('❌ Nenhum item de série encontrado');
      return;
    }
    
    const serialItem = serialItems[0];
    console.log(`✅ Item de série encontrado: ${serialItem.serialNumber} (Produto: ${serialItem.productId}, Local: ${serialItem.locationId})`);
    
    // 3. Buscar inventory_items antes do teste
    console.log('\n3. Verificando inventory_items antes do teste...');
    const itemsBeforeResponse = await makeRequest(`${BASE_URL}/inventories/${inventory.id}/items`);
    const itemsBefore = itemsBeforeResponse.data;
    
    const existingItem = itemsBefore.find(item => 
      item.productId === serialItem.productId && item.locationId === serialItem.locationId
    );
    
    console.log(`📊 Registro existente para produto ${serialItem.productId} no local ${serialItem.locationId}:`, 
      existingItem ? 'SIM' : 'NÃO');
    
    if (existingItem) {
      console.log(`   - Count1: ${existingItem.count1 || 0}`);
      console.log(`   - Count2: ${existingItem.count2 || 0}`);
      console.log(`   - Count3: ${existingItem.count3 || 0}`);
    }
    
    // 4. Simular leitura de serial
    console.log('\n4. Simulando leitura de serial...');
    const serialReadingRequest = {
      serialNumber: serialItem.serialNumber,
      countStage: 'count1'
    };
    
    try {
      const readingResponse = await makeRequest(
        `${BASE_URL}/inventories/${inventory.id}/serial-reading`,
        'POST',
        serialReadingRequest
      );
      
      console.log('✅ Leitura registrada com sucesso:');
      console.log(`   - Produto: ${readingResponse.data.productName}`);
      console.log(`   - Local: ${readingResponse.data.locationName}`);
      console.log(`   - Mensagem: ${readingResponse.data.message}`);
      
    } catch (error) {
      console.log('❌ Erro ao registrar leitura:', error.response?.data?.message || error.message);
      return;
    }
    
    // 5. Verificar inventory_items após o teste
    console.log('\n5. Verificando inventory_items após o teste...');
    const itemsAfterResponse = await makeRequest(`${BASE_URL}/inventories/${inventory.id}/items`);
    const itemsAfter = itemsAfterResponse.data;
    
    const updatedItem = itemsAfter.find(item => 
      item.productId === serialItem.productId && item.locationId === serialItem.locationId
    );
    
    if (updatedItem) {
      console.log('✅ Registro encontrado após leitura:');
      console.log(`   - Count1: ${updatedItem.count1 || 0}`);
      console.log(`   - Count2: ${updatedItem.count2 || 0}`);
      console.log(`   - Count3: ${updatedItem.count3 || 0}`);
      
      // Verificar se a contagem foi incrementada
      const count1Before = existingItem?.count1 || 0;
      const count1After = updatedItem.count1 || 0;
      
      if (count1After > count1Before) {
        console.log('✅ SUCESSO: Contagem foi incrementada corretamente!');
        console.log(`   - Antes: ${count1Before}`);
        console.log(`   - Depois: ${count1After}`);
      } else {
        console.log('❌ FALHA: Contagem não foi incrementada');
      }
    } else {
      console.log('❌ FALHA: Registro não encontrado após leitura');
    }
    
    console.log('\n🏁 Teste concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    if (error.response) {
      console.error('   - Status:', error.response.status);
      console.error('   - Data:', error.response.data);
    }
  }
}

// Executar o teste
testSerialLocationFix();