import dotenv from "dotenv";
dotenv.config({ override: true });
import express from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { errorHandler } from "./middlewares/error.middleware";
import { loggingMiddleware } from "./middlewares/logging.middleware";
import { rateLimiter } from "./middlewares/rate-limit.middleware";
import { logger } from "./utils/logger";

// Função para obter o IP externo
async function getExternalIP(): Promise<string | null> {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error("❌ Erro ao obter IP externo:", error);
    return null;
  }
}

// Função para exibir informações do IP no console
async function displayServerInfo(port: number) {
  logger.info("\n" + "=".repeat(60));
  logger.info("🚀 SERVIDOR INICIADO COM SUCESSO");
  logger.info("=".repeat(60));
  logger.info(`📍 Porta local: ${port}`);
  logger.info(`🌐 Endereço local: http://localhost:${port}`);

  // Obter e exibir IP externo
  const externalIP = await getExternalIP();
  if (externalIP) {
    logger.info(`🌍 IP EXTERNO DO SERVIDOR: ${externalIP}`);
    logger.info(`🔗 Acesso externo: http://${externalIP}:${port}`);
  } else {
    logger.warn("⚠️  Não foi possível obter o IP externo");
  }

  logger.info("=".repeat(60) + "\n");
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(rateLimiter);
app.use(loggingMiddleware);

(async () => {
  const port = parseInt(process.env.PORT || "3000", 10);
  await displayServerInfo(port);

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

  server.listen(
    {
      port,
      host: "0.0.0.0",
    },
    async () => {
      log(`serving on port ${port}`);
      // Exibir informações detalhadas do servidor incluindo IP externo
    },
  );
})();
