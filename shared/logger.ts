/**
 * Sistema de logging customizado que controla a exibição de mensagens baseado no ambiente
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerConfig {
  isDevelopment: boolean;
  enableDebug: boolean;
  enableInfo: boolean;
  enableWarn: boolean;
  enableError: boolean;
}

class Logger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  /**
   * Mensagens de debug - apenas em desenvolvimento
   */
  debug(...args: any[]): void {
    if (this.config.enableDebug && this.config.isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  }

  /**
   * Mensagens informativas - apenas em desenvolvimento
   */
  info(...args: any[]): void {
    if (this.config.enableInfo && this.config.isDevelopment) {
      console.info('[INFO]', ...args);
    }
  }

  /**
   * Mensagens de aviso - sempre visíveis
   */
  warn(...args: any[]): void {
    if (this.config.enableWarn) {
      console.warn('[WARN]', ...args);
    }
  }

  /**
   * Mensagens de erro - sempre visíveis
   */
  error(...args: any[]): void {
    if (this.config.enableError) {
      console.error('[ERROR]', ...args);
    }
  }

  /**
   * Log condicional baseado no nível
   */
  log(level: LogLevel, ...args: any[]): void {
    switch (level) {
      case 'debug':
        this.debug(...args);
        break;
      case 'info':
        this.info(...args);
        break;
      case 'warn':
        this.warn(...args);
        break;
      case 'error':
        this.error(...args);
        break;
    }
  }

  /**
   * Atualiza a configuração do logger
   */
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Função para criar configuração baseada no ambiente
export function createLoggerConfig(environment?: string): LoggerConfig {
  const isDevelopment = environment === 'development' || 
                       process.env.NODE_ENV === 'development' ||
                       (!environment && !process.env.NODE_ENV);

  return {
    isDevelopment,
    enableDebug: isDevelopment,
    enableInfo: isDevelopment,
    enableWarn: true, // Sempre habilitado
    enableError: true, // Sempre habilitado
  };
}

// Instância global do logger para o backend
let globalLogger: Logger | null = null;

export function initializeLogger(config?: LoggerConfig): Logger {
  if (!config) {
    config = createLoggerConfig();
  }
  
  globalLogger = new Logger(config);
  return globalLogger;
}

export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = initializeLogger();
  }
  return globalLogger;
}

// Export da instância padrão
export const logger = {
  debug: (...args: any[]) => getLogger().debug(...args),
  info: (...args: any[]) => getLogger().info(...args),
  warn: (...args: any[]) => getLogger().warn(...args),
  error: (...args: any[]) => getLogger().error(...args),
  log: (level: LogLevel, ...args: any[]) => getLogger().log(level, ...args),
};

export default logger;