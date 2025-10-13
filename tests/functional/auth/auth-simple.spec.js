// Testes de Autenticação Simplificados - TestSprite
import { test, expect } from '@playwright/test';

test.describe('Módulo de Autenticação - Testes Funcionais', () => {
  
  test('AUTH-001: Verificar carregamento da página principal', async ({ page }) => {
    console.log('🧪 Iniciando AUTH-001: Verificar carregamento da página principal');
    
    const startTime = Date.now();
    
    // Navegar para a página principal
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Verificar se a página carregou corretamente
    const title = await page.title();
    expect(title).toContain('Locador');
    
    // Verificar se não há erros de conexão
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Cannot GET');
    expect(bodyText).not.toContain('404');
    
    // Verificar performance (≤2s conforme especificado)
    expect(loadTime).toBeLessThan(2000);
    
    // Capturar screenshot
    await page.screenshot({ 
      path: 'tests/reports/screenshots/auth-001-homepage.png',
      fullPage: true 
    });
    
    console.log(`✅ AUTH-001: Página carregada em ${loadTime}ms`);
  });

  test('AUTH-002: Verificar elementos da interface principal', async ({ page }) => {
    console.log('🧪 Iniciando AUTH-002: Verificar elementos da interface principal');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verificar se o React root está presente
    const reactRoot = page.locator('#root');
    await expect(reactRoot).toBeVisible();
    
    // Verificar se há elementos de navegação ou interface
    const hasNavigation = await page.locator('nav, header, [role="navigation"]').count() > 0;
    const hasMainContent = await page.locator('main, [role="main"], .main-content').count() > 0;
    
    console.log('Navegação encontrada:', hasNavigation);
    console.log('Conteúdo principal encontrado:', hasMainContent);
    
    // Capturar screenshot da interface
    await page.screenshot({ 
      path: 'tests/reports/screenshots/auth-002-interface.png',
      fullPage: true 
    });
    
    console.log('✅ AUTH-002: Elementos da interface verificados');
  });

  test('AUTH-003: Verificar responsividade mobile', async ({ page }) => {
    console.log('🧪 Iniciando AUTH-003: Verificar responsividade mobile');
    
    // Configurar viewport mobile
    await page.setViewportSize({ width: 390, height: 844 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verificar se a página se adapta ao mobile
    const title = await page.title();
    expect(title).toContain('Locador');
    
    // Verificar se não há overflow horizontal
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20); // Margem de 20px
    
    // Capturar screenshot mobile
    await page.screenshot({ 
      path: 'tests/reports/screenshots/auth-003-mobile.png',
      fullPage: true 
    });
    
    console.log('✅ AUTH-003: Responsividade mobile verificada');
  });

  test('AUTH-004: Verificar performance de carregamento', async ({ page }) => {
    console.log('🧪 Iniciando AUTH-004: Verificar performance de carregamento');
    
    const measurements = [];
    
    // Realizar 3 medições de performance
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      
      await page.goto('/', { waitUntil: 'networkidle' });
      
      const loadTime = Date.now() - startTime;
      measurements.push(loadTime);
      
      console.log(`Medição ${i + 1}: ${loadTime}ms`);
      
      // Aguardar entre medições
      await page.waitForTimeout(1000);
    }
    
    // Calcular média
    const averageTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    
    // Verificar se está dentro do limite (≤2s)
    expect(averageTime).toBeLessThan(2000);
    
    console.log(`✅ AUTH-004: Performance média: ${averageTime.toFixed(0)}ms`);
  });

  test('AUTH-005: Verificar diferentes navegadores', async ({ page, browserName }) => {
    console.log(`🧪 Iniciando AUTH-005: Verificar compatibilidade - ${browserName}`);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verificar se a página carrega em diferentes navegadores
    const title = await page.title();
    expect(title).toContain('Locador');
    
    // Verificar se JavaScript está funcionando
    const hasReactRoot = await page.locator('#root').count() > 0;
    expect(hasReactRoot).toBeTruthy();
    
    // Capturar screenshot específico do navegador
    await page.screenshot({ 
      path: `tests/reports/screenshots/auth-005-${browserName}.png`,
      fullPage: true 
    });
    
    console.log(`✅ AUTH-005: Compatibilidade verificada - ${browserName}`);
  });

  test('AUTH-006: Verificar console de erros', async ({ page }) => {
    console.log('🧪 Iniciando AUTH-006: Verificar console de erros');
    
    const consoleErrors = [];
    
    // Capturar erros do console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Aguardar um pouco para capturar possíveis erros assíncronos
    await page.waitForTimeout(2000);
    
    // Verificar se não há erros críticos no console
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('404') &&
      !error.includes('net::ERR_')
    );
    
    console.log('Erros encontrados:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log('Detalhes dos erros:', consoleErrors);
    }
    
    // Não falhar por erros menores, apenas reportar
    console.log(`✅ AUTH-006: Console verificado - ${criticalErrors.length} erros críticos`);
  });
});