
import express from 'express';
import https from 'https';

const router = express.Router();

router.get('/check-ip', async (req, res) => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    
    console.log('🌐 Replit outbound IP:', data.ip);
    
    res.json({
      success: true,
      outboundIP: data.ip,
      message: 'Este é o IP que você deve liberar no firewall do SQL Server'
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
