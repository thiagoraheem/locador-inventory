// Configuração Playwright para TestSprite - Sistema Inventário Locador
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  
  // Configurações globais
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  
  // Reporter configurado para TestSprite
  reporter: [
    ['html', { outputFolder: './tests/reports/html' }],
    ['json', { outputFile: './tests/reports/json/results.json' }],
    ['junit', { outputFile: './tests/reports/junit.xml' }]
  ],
  
  // Configurações globais de teste
  use: {
    baseURL: 'http://localhost:5401',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Timeouts conforme especificado no plano
    actionTimeout: 5000,
    navigationTimeout: 30000,
  },

  // Projetos de teste para diferentes browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Testes Mobile
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    
    // Testes Tablet
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
    },
  ],

  // Configuração do servidor web para testes (desabilitado temporariamente)
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
  
  // Configurações específicas do TestSprite
  expect: {
    // Timeout para assertions
    timeout: 10000,
  },
  
  // Configurações de performance
  timeout: 30000,
  
  // Diretórios de output
  outputDir: './tests/reports/test-results',
});