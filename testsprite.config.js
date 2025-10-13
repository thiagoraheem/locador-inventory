// Configuração TestSprite para Sistema Inventário Locador
module.exports = {
  projectName: 'Sistema Inventário Locador',
  version: '1.0.0',
  
  environments: {
    dev: 'http://localhost:5401',
    test: 'https://test-inventory.locador.com',
    staging: 'https://staging-inventory.locador.com'
  },
  
  browsers: ['chrome', 'firefox', 'safari', 'edge'],
  
  mobile: {
    devices: ['iPhone 12', 'iPad Pro', 'Samsung Galaxy S21', 'Pixel 5'],
    orientations: ['portrait', 'landscape']
  },
  
  timeouts: {
    default: 10000,
    page: 30000,
    element: 5000
  },
  
  screenshots: {
    onFailure: true,
    onSuccess: false,
    path: './tests/reports/screenshots'
  },
  
  reports: {
    html: './tests/reports/html',
    json: './tests/reports/json',
    junit: './tests/reports/junit.xml'
  },
  
  parallel: {
    workers: 4,
    maxRetries: 2
  },
  
  // Configurações específicas do sistema
  testData: {
    users: './tests/data/users.json',
    products: './tests/data/products.json',
    inventories: './tests/data/inventories.json'
  },
  
  // Métricas de performance
  performance: {
    responseTime: {
      max: 2000, // 2 segundos conforme especificado
      warning: 1500
    },
    concurrentUsers: 50,
    memoryUsage: true,
    cpuUsage: true,
    networkLatency: true
  },
  
  // Configurações de logging
  logging: {
    level: 'debug',
    format: 'json',
    files: {
      test: './tests/logs/test-execution.log',
      performance: './tests/logs/performance.log',
      errors: './tests/logs/errors.log'
    }
  }
};