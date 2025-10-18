/**
 * Logger para o frontend - versão específica para o cliente
 */

import { logger as sharedLogger, createLoggerConfig, initializeLogger } from '@shared/logger';

// Detecta se está em desenvolvimento baseado no Vite
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

// Inicializa o logger com configuração específica do frontend
const config = createLoggerConfig(isDevelopment ? 'development' : 'production');
initializeLogger(config);

// Re-exporta o logger configurado
export const logger = sharedLogger;
export default logger;

// Função para debug condicional - compatibilidade com código existente
export const debugLog = (...args: any[]) => {
  logger.debug(...args);
};

// Função para info condicional - compatibilidade com código existente
export const infoLog = (...args: any[]) => {
  logger.info(...args);
};