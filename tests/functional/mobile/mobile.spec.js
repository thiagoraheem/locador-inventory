// Testes de Interface Mobile - TestSprite
// Casos: MOB-001, MOB-002

import { test, expect } from '@playwright/test';
import TestHelpers from '../../utils/test-helpers.js';

const helpers = new TestHelpers();

test.describe('Módulo de Interface Mobile', () => {
  
  test.beforeEach(async ({ page }) => {
    // Configurar viewport mobile antes de cada teste
    await helpers.setMobileViewport(page, 'iPhone 12');
    
    // Login como operador para testes mobile
    await helpers.login(page, 'operator');
  });

  // MOB-001: Scanner de código de barras
  test('MOB-001: Scanner de código de barras', async ({ page }) => {
    const testProduct = helpers.getTestProduct(1);
    
    // Passo 1: Navegar para interface mobile de contagem
    await page.goto('/mobile/counting');
    await expect(page).toHaveURL('/mobile/counting');
    
    // Passo 2: Verificar elementos da interface mobile
    await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="scanner-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="manual-input-toggle"]')).toBeVisible();
    
    // Passo 3: Ativar scanner de código de barras
    await page.click('[data-testid="activate-scanner-button"]');
    
    // Verificar que câmera foi ativada (simulação)
    await expect(page.locator('[data-testid="camera-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="scanner-overlay"]')).toBeVisible();
    
    // Passo 4: Simular leitura de código de barras
    // Em ambiente de teste, simularemos a leitura
    await page.evaluate((productCode) => {
      // Simular evento de leitura de código de barras
      window.dispatchEvent(new CustomEvent('barcode-scanned', {
        detail: { code: productCode }
      }));
    }, testProduct.code);
    
    // Passo 5: Verificar processamento do código lido
    await expect(page.locator('[data-testid="scanned-product"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-name"]')).toContainText(testProduct.name);
    await expect(page.locator('[data-testid="product-code"]')).toContainText(testProduct.code);
    
    // Passo 6: Confirmar contagem
    await page.fill('[data-testid="quantity-input"]', '1');
    
    // Medir tempo de resposta da confirmação
    const responseTime = await helpers.measureResponseTime(page, async () => {
      await page.click('[data-testid="confirm-count-button"]');
      await page.waitForSelector('[data-testid="count-success-message"]');
    });
    
    expect(responseTime).toBeLessThan(2000);
    
    // Passo 7: Verificar feedback visual de sucesso
    await expect(page.locator('[data-testid="count-success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-animation"]')).toBeVisible();
    
    // Passo 8: Testar precisão do scanner (99% conforme especificado)
    // Simular múltiplas leituras para testar precisão
    const scanResults = [];
    for (let i = 0; i < 10; i++) {
      await page.evaluate((productCode) => {
        window.dispatchEvent(new CustomEvent('barcode-scanned', {
          detail: { code: productCode }
        }));
      }, testProduct.code);
      
      const scannedCode = await page.locator('[data-testid="scanned-code"]').textContent();
      scanResults.push(scannedCode === testProduct.code);
      
      // Aguardar entre leituras
      await page.waitForTimeout(500);
    }
    
    const accuracy = (scanResults.filter(Boolean).length / scanResults.length) * 100;
    expect(accuracy).toBeGreaterThanOrEqual(99); // 99% de precisão conforme especificado
    
    // Capturar screenshot do scanner
    await helpers.takeScreenshot(page, 'mob-001-barcode-scanner');
    
    console.log(`✅ MOB-001: Scanner funcionando com ${accuracy}% de precisão em ${responseTime}ms`);
  });

  // MOB-002: Interface touch otimizada
  test('MOB-002: Interface touch otimizada', async ({ page }) => {
    
    // Passo 1: Navegar para interface mobile principal
    await page.goto('/mobile');
    await expect(page).toHaveURL('/mobile');
    
    // Passo 2: Verificar elementos otimizados para touch
    await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
    await expect(page.locator('[data-testid="touch-friendly-buttons"]')).toHaveCount.greaterThan(0);
    
    // Passo 3: Testar tamanho mínimo dos elementos touch (44px conforme guidelines)
    const touchElements = await page.locator('[data-testid="touch-element"]').all();
    
    for (const element of touchElements) {
      const boundingBox = await element.boundingBox();
      expect(boundingBox.width).toBeGreaterThanOrEqual(44);
      expect(boundingBox.height).toBeGreaterThanOrEqual(44);
    }
    
    // Passo 4: Testar navegação por gestos
    // Swipe para navegar entre seções
    await page.touchscreen.tap(200, 400);
    await page.mouse.move(200, 400);
    await page.mouse.down();
    await page.mouse.move(100, 400);
    await page.mouse.up();
    
    // Verificar que navegação por swipe funcionou
    await expect(page.locator('[data-testid="swipe-navigation-indicator"]')).toBeVisible();
    
    // Passo 5: Testar menu hambúrguer mobile
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu-drawer"]')).toBeVisible();
    
    // Verificar itens do menu
    await expect(page.locator('[data-testid="menu-inventory"]')).toBeVisible();
    await expect(page.locator('[data-testid="menu-counting"]')).toBeVisible();
    await expect(page.locator('[data-testid="menu-reports"]')).toBeVisible();
    
    // Passo 6: Testar responsividade em diferentes orientações
    // Rotacionar para landscape
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(1000);
    
    // Verificar adaptação do layout
    await expect(page.locator('[data-testid="landscape-layout"]')).toBeVisible();
    
    // Voltar para portrait
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1000);
    
    // Passo 7: Testar formulários otimizados para mobile
    await page.click('[data-testid="menu-counting"]');
    await expect(page.locator('[data-testid="mobile-counting-form"]')).toBeVisible();
    
    // Verificar campos com teclado apropriado
    const numberInput = page.locator('[data-testid="quantity-input"]');
    await numberInput.click();
    
    // Verificar que teclado numérico é exibido (através do atributo inputmode)
    await expect(numberInput).toHaveAttribute('inputmode', 'numeric');
    
    // Passo 8: Testar feedback tátil (vibração)
    await page.evaluate(() => {
      // Simular vibração em dispositivos suportados
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
    });
    
    // Passo 9: Testar performance em dispositivos móveis
    const startTime = Date.now();
    
    await page.goto('/mobile/inventory');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // 3 segundos para mobile
    
    // Passo 10: Testar modo offline (PWA)
    // Simular perda de conexão
    await page.context().setOffline(true);
    
    // Verificar que interface offline é exibida
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-message"]')).toContainText(/sem conexão|offline/i);
    
    // Restaurar conexão
    await page.context().setOffline(false);
    await page.waitForTimeout(2000);
    
    // Verificar que voltou ao modo online
    await expect(page.locator('[data-testid="online-indicator"]')).toBeVisible();
    
    // Capturar screenshot da interface mobile
    await helpers.takeScreenshot(page, 'mob-002-touch-interface');
    
    console.log(`✅ MOB-002: Interface touch otimizada funcionando em ${loadTime}ms`);
  });

  // Teste adicional: Compatibilidade com diferentes dispositivos
  test('MOB-003: Compatibilidade com diferentes dispositivos', async ({ page }) => {
    const devices = [
      { name: 'iPhone 12', width: 390, height: 844 },
      { name: 'Samsung Galaxy S21', width: 360, height: 800 },
      { name: 'Pixel 5', width: 393, height: 851 }
    ];
    
    for (const device of devices) {
      await page.setViewportSize({ width: device.width, height: device.height });
      await page.goto('/mobile');
      
      // Verificar que interface se adapta ao dispositivo
      await expect(page.locator('[data-testid="mobile-container"]')).toBeVisible();
      
      // Capturar screenshot para cada dispositivo
      await helpers.takeScreenshot(page, `mob-003-${device.name.toLowerCase().replace(/\s+/g, '-')}`);
    }
    
    console.log('✅ MOB-003: Compatibilidade com diferentes dispositivos testada');
  });

  // Teste adicional: Funcionalidade offline
  test('MOB-004: Funcionalidade offline', async ({ page }) => {
    await page.goto('/mobile/counting');
    
    // Realizar algumas ações online primeiro
    const testProduct = helpers.getTestProduct(1);
    
    await page.evaluate((productCode) => {
      window.dispatchEvent(new CustomEvent('barcode-scanned', {
        detail: { code: productCode }
      }));
    }, testProduct.code);
    
    await page.fill('[data-testid="quantity-input"]', '1');
    await page.click('[data-testid="confirm-count-button"]');
    
    // Simular perda de conexão
    await page.context().setOffline(true);
    
    // Tentar realizar ação offline
    await page.evaluate((productCode) => {
      window.dispatchEvent(new CustomEvent('barcode-scanned', {
        detail: { code: productCode }
      }));
    }, testProduct.code);
    
    await page.fill('[data-testid="quantity-input"]', '2');
    await page.click('[data-testid="confirm-count-button"]');
    
    // Verificar que ação foi armazenada localmente
    await expect(page.locator('[data-testid="offline-queue-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-sync-count"]')).toContainText('1');
    
    // Restaurar conexão
    await page.context().setOffline(false);
    await page.waitForTimeout(3000);
    
    // Verificar sincronização automática
    await expect(page.locator('[data-testid="sync-success-message"]')).toBeVisible();
    
    console.log('✅ MOB-004: Funcionalidade offline testada');
  });

  // Teste adicional: Acessibilidade mobile
  test('MOB-005: Acessibilidade mobile', async ({ page }) => {
    await page.goto('/mobile');
    
    // Verificar elementos de acessibilidade
    const buttons = await page.locator('button').all();
    
    for (const button of buttons) {
      // Verificar que botões têm labels acessíveis
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      
      expect(ariaLabel || textContent).toBeTruthy();
    }
    
    // Verificar contraste de cores (simulação)
    const backgroundColor = await page.locator('[data-testid="mobile-container"]').evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    
    const textColor = await page.locator('[data-testid="mobile-text"]').evaluate(el => {
      return window.getComputedStyle(el).color;
    });
    
    // Verificar que cores não são iguais (contraste básico)
    expect(backgroundColor).not.toBe(textColor);
    
    console.log('✅ MOB-005: Acessibilidade mobile verificada');
  });

  // Teste adicional: Performance do scanner
  test('MOB-006: Performance do scanner', async ({ page }) => {
    await page.goto('/mobile/counting');
    
    // Medir tempo de ativação do scanner
    const activationTime = await helpers.measureResponseTime(page, async () => {
      await page.click('[data-testid="activate-scanner-button"]');
      await page.waitForSelector('[data-testid="camera-preview"]');
    });
    
    expect(activationTime).toBeLessThan(1000); // 1 segundo para ativar scanner
    
    // Testar múltiplas leituras consecutivas
    const scanTimes = [];
    const testProduct = helpers.getTestProduct(1);
    
    for (let i = 0; i < 5; i++) {
      const scanTime = await helpers.measureResponseTime(page, async () => {
        await page.evaluate((productCode) => {
          window.dispatchEvent(new CustomEvent('barcode-scanned', {
            detail: { code: productCode }
          }));
        }, testProduct.code);
        
        await page.waitForSelector('[data-testid="scanned-product"]');
      });
      
      scanTimes.push(scanTime);
      await page.waitForTimeout(100);
    }
    
    const averageScanTime = scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length;
    expect(averageScanTime).toBeLessThan(500); // Média de 500ms por scan
    
    console.log(`✅ MOB-006: Scanner ativado em ${activationTime}ms, média de scan ${averageScanTime}ms`);
  });
});