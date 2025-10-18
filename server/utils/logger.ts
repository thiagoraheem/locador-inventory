/**
 * Logger para o backend - versão específica para o servidor
 */

import { logger as sharedLogger, createLoggerConfig, initializeLogger } from '@shared/logger';

// Detecta se está em desenvolvimento baseado no NODE_ENV
const environment = process.env.NODE_ENV || 'development';

// Inicializa o logger com configuração específica do backend
const config = createLoggerConfig(environment);
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