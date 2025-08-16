// Script de debug para testar leitura de serial com divergência de localização

// Primeiro fazer login
async function login() {
  try {
    const loginData = {
      username: 'admin',
      password: 'admin123'
    };
    
    const response = await fetch('http://localhost:5401/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(loginData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Login realizado com sucesso!');
      console.log('Usuário:', result.user);
      return true;
    } else {
      console.log('❌ Falha no login:', result.message);
      return false;
    }
  } catch (error) {
    console.error('Erro no login:', error);
    return false;
  }
}

async function testSerialReading() {
  try {
    console.log('Testando leitura de serial com divergência de localização...');
    
    const requestData = {
      serialNumber: '002606',
      countStage: 'count1',
      scannedLocationId: 2
    };
    
    console.log('Dados que serão enviados:', requestData);
    
    // Fazer a requisição para o backend
    const response = await fetch('http://localhost:5401/api/inventories/35/serial-reading', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(requestData)
    });
    
    const result = await response.json();
    console.log('Resposta do backend:', result);
    
    if (result.success) {
      console.log('✅ Leitura registrada com sucesso!');
      if (result.productId) {
        console.log(`📦 Produto ID: ${result.productId}`);
      }
      if (result.productName) {
        console.log(`📝 Produto: ${result.productName}`);
      }
    } else {
      console.log('❌ Falha na leitura:');
      if (result.alreadyRead) {
        console.log('   - Serial já foi lido neste estágio');
      }
      if (result.newSerial) {
        console.log('   - Número de série não encontrado no sistema');
      }
      if (result.message) {
        console.log(`   - ${result.message}`);
      }
    }
    
  } catch (error) {
    console.error('Erro na requisição:', error);
  }
}

async function runTest() {
  console.log('Iniciando teste completo...');
  
  const loginSuccess = await login();
  if (loginSuccess) {
    await testSerialReading();
  } else {
    console.log('❌ Não foi possível prosseguir sem login');
  }
}

console.log('Script de debug carregado. Executando teste...');
runTest();