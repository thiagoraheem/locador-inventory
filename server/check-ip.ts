
import express from 'express';
import https from 'https';
import os from 'os';

const router = express.Router();

router.get('/check-ip', async (req, res) => {
  try {
    // Obter interfaces de rede
    const networkInterfaces = os.networkInterfaces();
    const localIPs = [];
    
    // Extrair todos os IPs IPv4 não internos
    Object.keys(networkInterfaces).forEach(interfaceName => {
      const interfaces = networkInterfaces[interfaceName];
      if (interfaces) {
        interfaces.forEach(iface => {
          // Filtrar apenas IPv4 e excluir endereços de loopback (127.0.0.1)
          if (iface.family === 'IPv4' && !iface.internal) {
            localIPs.push({
              interface: interfaceName,
              ip: iface.address
            });
          }
        });
      }
    });
    
    console.log('🖥️ IPs da máquina local:', localIPs);
    
    // Também obter o IP externo para referência
    let externalIP = null;
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      externalIP = data.ip;
      console.log('🌐 IP externo:', externalIP);
    } catch (externalError) {
      console.error('⚠️ Não foi possível obter o IP externo:', externalError);
    }
    
    res.json({
      success: true,
      localIPs: localIPs,
      externalIP: externalIP,
      message: 'Estes são os IPs da máquina onde o aplicativo está sendo executado'
    });
  } catch (error) {
    console.error('❌ Erro ao verificar IP:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar IP de saída'
    });
  }
});

export default router;
