// Utilitários auxiliares para testes TestSprite
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class TestHelpers {
  constructor() {
    this.testData = this.loadTestData();
  }

  // Carrega dados de teste dos arquivos JSON
  loadTestData() {
    const dataPath = path.join(__dirname, '../data');
    return {
      users: JSON.parse(fs.readFileSync(path.join(dataPath, 'users.json'), 'utf8')),
      products: JSON.parse(fs.readFileSync(path.join(dataPath, 'products.json'), 'utf8')),
      inventories: JSON.parse(fs.readFileSync(path.join(dataPath, 'inventories.json'), 'utf8'))
    };
  }

  // Obtém usuário de teste por tipo
  getTestUser(userType = 'admin') {
    return this.testData.users.users[userType];
  }

  // Obtém produto de teste por ID
  getTestProduct(productId = 1) {
    return this.testData.products.products.find(p => p.id === productId);
  }

  // Obtém inventário de teste por ID
  getTestInventory(inventoryId = 1) {
    return this.testData.inventories.inventories.find(i => i.id === inventoryId);
  }

  // Gera dados aleatórios para testes
  generateRandomData() {
    return {
      email: `test${Date.now()}@locador.com`,
      password: 'Test123!',
      productCode: `PROD${Date.now()}`,
      serialNumber: `SN${Date.now()}`,
      inventoryName: `Inventário Teste ${Date.now()}`
    };
  }

  // Aguarda elemento aparecer na tela
  async waitForElement(page, selector, timeout = 10000) {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      console.error(`Elemento ${selector} não encontrado após ${timeout}ms`);
      return false;
    }
  }

  // Aguarda elemento desaparecer da tela
  async waitForElementToDisappear(page, selector, timeout = 10000) {
    try {
      await page.waitForSelector(selector, { hidden: true, timeout });
      return true;
    } catch (error) {
      console.error(`Elemento ${selector} ainda visível após ${timeout}ms`);
      return false;
    }
  }

  // Realiza login no sistema
  async login(page, userType = 'admin') {
    const user = this.getTestUser(userType);
    
    // Navega para página de login
    await page.goto('/login');
    
    // Preenche credenciais
    await page.fill('[data-testid="email-input"]', user.email);
    await page.fill('[data-testid="password-input"]', user.password);
    
    // Clica no botão de login
    await page.click('[data-testid="login-button"]');
    
    // Aguarda redirecionamento
    await page.waitForURL('/dashboard');
    
    return true;
  }

  // Realiza logout do sistema
  async logout(page) {
    // Clica no menu do usuário
    await page.click('[data-testid="user-menu"]');
    
    // Clica em logout
    await page.click('[data-testid="logout-button"]');
    
    // Aguarda redirecionamento para login
    await page.waitForURL('/login');
    
    return true;
  }

  // Captura screenshot com timestamp
  async takeScreenshot(page, testName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${testName}-${timestamp}.png`;
    const screenshotPath = path.join(__dirname, '../reports/screenshots', filename);
    
    // Cria diretório se não existir
    const dir = path.dirname(screenshotPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    await page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
  }

  // Mede tempo de resposta de uma ação
  async measureResponseTime(page, action) {
    const startTime = Date.now();
    await action();
    const endTime = Date.now();
    return endTime - startTime;
  }

  // Verifica se elemento está visível
  async isElementVisible(page, selector) {
    try {
      const element = await page.$(selector);
      return element !== null && await element.isVisible();
    } catch (error) {
      return false;
    }
  }

  // Preenche formulário com dados
  async fillForm(page, formData) {
    for (const [field, value] of Object.entries(formData)) {
      const selector = `[data-testid="${field}"]`;
      await page.fill(selector, value.toString());
    }
  }

  // Aguarda carregamento da página
  async waitForPageLoad(page, timeout = 30000) {
    await page.waitForLoadState('networkidle', { timeout });
  }

  // Simula dispositivo móvel
  async setMobileViewport(page, device = 'iPhone 12') {
    const devices = {
      'iPhone 12': { width: 390, height: 844 },
      'iPad Pro': { width: 1024, height: 1366 },
      'Samsung Galaxy S21': { width: 360, height: 800 },
      'Pixel 5': { width: 393, height: 851 }
    };
    
    const viewport = devices[device] || devices['iPhone 12'];
    await page.setViewportSize(viewport);
  }

  // Gera relatório de teste
  generateTestReport(testResults) {
    const report = {
      timestamp: new Date().toISOString(),
      totalTests: testResults.length,
      passed: testResults.filter(r => r.status === 'passed').length,
      failed: testResults.filter(r => r.status === 'failed').length,
      skipped: testResults.filter(r => r.status === 'skipped').length,
      results: testResults
    };
    
    return report;
  }

  // Salva relatório em arquivo
  async saveTestReport(report, filename) {
    const reportsDir = path.join(__dirname, '../reports/json');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const filePath = path.join(reportsDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    
    return filePath;
  }
}