import 'dotenv/config';
import express from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { errorHandler } from "./middlewares/error.middleware";
import { loggingMiddleware } from "./middlewares/logging.middleware";
import { rateLimiter } from "./middlewares/rate-limit.middleware";

// Função para obter o IP externo
async function getExternalIP(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('❌ Erro ao obter IP externo:', error);
    return null;
  }
}

// Função para exibir informações do IP no console
async function displayServerInfo(port: number) {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 SERVIDOR INICIADO COM SUCESSO');
  console.log('='.repeat(60));
  console.log(`📍 Porta local: ${port}`);
  console.log(`🌐 Endereço local: http://localhost:${port}`);
  
  // Obter e exibir IP externo
  const externalIP = await getExternalIP();
  if (externalIP) {
    console.log(`🌍 IP EXTERNO DO SERVIDOR: ${externalIP}`);
    console.log(`🔗 Acesso externo: http://${externalIP}:${port}`);
  } else {
    console.log('⚠️  Não foi possível obter o IP externo');
  }
  
  console.log('='.repeat(60) + '\n');
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(rateLimiter);
app.use(loggingMiddleware);

(async () => {
  const server = await registerRoutes(app);

  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0"
    },
    async () => {
      log(`serving on port ${port}`);
      // Exibir informações detalhadas do servidor incluindo IP externo
      await displayServerInfo(port);
    },
  );
})();
