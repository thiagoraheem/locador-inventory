// Testes de Inventário Multi-Estágio - TestSprite
// Casos: INV-001, INV-002, INV-003

import { test, expect } from '@playwright/test';
import TestHelpers from '../../utils/test-helpers.js';

const helpers = new TestHelpers();

test.describe('Módulo de Inventário Multi-Estágio', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login como operador antes de cada teste
    await helpers.login(page, 'operator');
  });

  // INV-001: Criação de inventário geral
  test('INV-001: Criação de inventário geral', async ({ page }) => {
    const randomData = helpers.generateRandomData();
    
    // Passo 1: Navegar para página de inventários
    await page.goto('/inventory');
    await expect(page).toHaveURL('/inventory');
    
    // Passo 2: Clicar em "Novo Inventário"
    await page.click('[data-testid="new-inventory-button"]');
    await expect(page.locator('[data-testid="inventory-form"]')).toBeVisible();
    
    // Passo 3: Preencher dados do inventário
    const inventoryData = {
      'inventory-name': randomData.inventoryName,
      'inventory-description': 'Inventário de teste automatizado',
      'inventory-type': 'geral',
      'inventory-location': 'Todas as unidades'
    };
    
    await helpers.fillForm(page, inventoryData);
    
    // Passo 4: Selecionar tipo "Geral"
    await page.selectOption('[data-testid="inventory-type"]', 'geral');
    
    // Passo 5: Medir tempo de criação
    const responseTime = await helpers.measureResponseTime(page, async () => {
      await page.click('[data-testid="create-inventory-button"]');
      await page.waitForSelector('[data-testid="inventory-created-success"]');
    });
    
    // Verificações
    expect(responseTime).toBeLessThan(2000);
    await expect(page.locator('[data-testid="inventory-created-success"]')).toBeVisible();
    
    // Passo 6: Verificar redirecionamento para lista de inventários
    await expect(page).toHaveURL(/\/inventory/);
    
    // Passo 7: Verificar inventário na lista
    await expect(page.locator(`text=${randomData.inventoryName}`)).toBeVisible();
    await expect(page.locator('[data-testid="inventory-status"]')).toContainText('Planejado');
    
    // Capturar screenshot
    await helpers.takeScreenshot(page, 'inv-001-inventory-created');
    
    console.log(`✅ INV-001: Inventário geral criado com sucesso em ${responseTime}ms`);
  });

  // INV-002: Processo de contagem C1 a C4
  test('INV-002: Processo de contagem C1 a C4', async ({ page }) => {
    const testInventory = helpers.getTestInventory(1);
    const testProduct = helpers.getTestProduct(1);
    
    // Passo 1: Navegar para inventário específico
    await page.goto(`/inventory/${testInventory.id}`);
    await expect(page.locator('[data-testid="inventory-details"]')).toBeVisible();
    
    // Passo 2: Iniciar processo de contagem C1
    await page.click('[data-testid="start-counting-button"]');
    await expect(page.locator('[data-testid="counting-stage"]')).toContainText('C1');
    
    // Passo 3: Realizar contagem C1
    await page.fill('[data-testid="product-search"]', testProduct.code);
    await page.click('[data-testid="search-button"]');
    
    await expect(page.locator(`[data-testid="product-${testProduct.id}"]`)).toBeVisible();
    await page.fill(`[data-testid="quantity-${testProduct.id}"]`, '1');
    await page.click(`[data-testid="count-${testProduct.id}"]`);
    
    // Verificar status C1 concluído
    await expect(page.locator(`[data-testid="status-${testProduct.id}"]`)).toContainText('C1 Concluído');
    
    // Passo 4: Avançar para C2
    await page.click('[data-testid="advance-to-c2"]');
    await expect(page.locator('[data-testid="counting-stage"]')).toContainText('C2');
    
    // Passo 5: Realizar contagem C2 (recontagem)
    await page.fill(`[data-testid="quantity-${testProduct.id}"]`, '1');
    await page.click(`[data-testid="recount-${testProduct.id}"]`);
    
    // Verificar status C2 concluído
    await expect(page.locator(`[data-testid="status-${testProduct.id}"]`)).toContainText('C2 Concluído');
    
    // Passo 6: Simular divergência para C3
    await page.click('[data-testid="advance-to-c3"]');
    await expect(page.locator('[data-testid="counting-stage"]')).toContainText('C3');
    
    // Passo 7: Realizar contagem C3 (auditoria)
    await page.fill(`[data-testid="quantity-${testProduct.id}"]`, '1');
    await page.fill(`[data-testid="audit-notes-${testProduct.id}"]`, 'Produto conferido - quantidade correta');
    await page.click(`[data-testid="audit-${testProduct.id}"]`);
    
    // Verificar status C3 concluído
    await expect(page.locator(`[data-testid="status-${testProduct.id}"]`)).toContainText('C3 Concluído');
    
    // Passo 8: Finalizar em C4
    await page.click('[data-testid="advance-to-c4"]');
    await expect(page.locator('[data-testid="counting-stage"]')).toContainText('C4');
    
    await page.click(`[data-testid="finalize-${testProduct.id}"]`);
    await expect(page.locator(`[data-testid="status-${testProduct.id}"]`)).toContainText('Finalizado');
    
    // Capturar screenshot do processo completo
    await helpers.takeScreenshot(page, 'inv-002-c1-to-c4-complete');
    
    console.log('✅ INV-002: Processo C1 a C4 executado com sucesso');
  });

  // INV-003: Criação de inventário rotativo
  test('INV-003: Criação de inventário rotativo', async ({ page }) => {
    const randomData = helpers.generateRandomData();
    const testProducts = [
      helpers.getTestProduct(1),
      helpers.getTestProduct(3),
      helpers.getTestProduct(4)
    ];
    
    // Passo 1: Navegar para criação de inventário
    await page.goto('/inventory');
    await page.click('[data-testid="new-inventory-button"]');
    
    // Passo 2: Preencher dados básicos
    const inventoryData = {
      'inventory-name': `Inventário Rotativo ${randomData.inventoryName}`,
      'inventory-description': 'Inventário rotativo de teste automatizado',
      'inventory-location': 'Almoxarifado A'
    };
    
    await helpers.fillForm(page, inventoryData);
    
    // Passo 3: Selecionar tipo "Rotativo"
    await page.selectOption('[data-testid="inventory-type"]', 'rotativo');
    
    // Passo 4: Verificar aparição do seletor de produtos
    await expect(page.locator('[data-testid="product-selector"]')).toBeVisible();
    
    // Passo 5: Selecionar produtos específicos
    for (const product of testProducts) {
      await page.check(`[data-testid="product-checkbox-${product.id}"]`);
      
      // Verificar produto selecionado
      await expect(page.locator(`[data-testid="selected-product-${product.id}"]`)).toBeVisible();
    }
    
    // Passo 6: Verificar resumo de produtos selecionados
    await expect(page.locator('[data-testid="selected-products-count"]')).toContainText('3');
    
    // Passo 7: Criar inventário rotativo
    const responseTime = await helpers.measureResponseTime(page, async () => {
      await page.click('[data-testid="create-inventory-button"]');
      await page.waitForSelector('[data-testid="inventory-created-success"]');
    });
    
    // Verificações
    expect(responseTime).toBeLessThan(2000);
    await expect(page.locator('[data-testid="inventory-created-success"]')).toBeVisible();
    
    // Passo 8: Verificar inventário criado com produtos específicos
    await page.goto('/inventory');
    await page.click(`[data-testid="inventory-${randomData.inventoryName}"]`);
    
    // Verificar que apenas os produtos selecionados estão no inventário
    for (const product of testProducts) {
      await expect(page.locator(`[data-testid="inventory-product-${product.id}"]`)).toBeVisible();
    }
    
    // Verificar que outros produtos não estão presentes
    const otherProduct = helpers.getTestProduct(2);
    await expect(page.locator(`[data-testid="inventory-product-${otherProduct.id}"]`)).not.toBeVisible();
    
    // Capturar screenshot
    await helpers.takeScreenshot(page, 'inv-003-rotative-inventory-created');
    
    console.log(`✅ INV-003: Inventário rotativo criado com sucesso em ${responseTime}ms`);
  });

  // Teste adicional: Validação de dados obrigatórios
  test('INV-004: Validação de campos obrigatórios', async ({ page }) => {
    await page.goto('/inventory');
    await page.click('[data-testid="new-inventory-button"]');
    
    // Tentar criar sem preencher campos
    await page.click('[data-testid="create-inventory-button"]');
    
    // Verificar mensagens de validação
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="type-error"]')).toBeVisible();
    
    console.log('✅ INV-004: Validação de campos obrigatórios funcionando');
  });

  // Teste adicional: Busca e filtros de inventário
  test('INV-005: Busca e filtros de inventário', async ({ page }) => {
    await page.goto('/inventory');
    
    // Testar busca por nome
    await page.fill('[data-testid="inventory-search"]', 'Janeiro');
    await page.click('[data-testid="search-button"]');
    
    // Verificar resultados filtrados
    await expect(page.locator('[data-testid="inventory-list"]')).toContainText('Janeiro');
    
    // Testar filtro por status
    await page.selectOption('[data-testid="status-filter"]', 'em_andamento');
    
    // Verificar filtro aplicado
    await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible();
    
    console.log('✅ INV-005: Busca e filtros funcionando corretamente');
  });

  // Teste de performance: Carregamento de lista de inventários
  test('INV-006: Performance da lista de inventários', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Verificar tempo de carregamento
    expect(loadTime).toBeLessThan(2000);
    
    // Verificar elementos carregados
    await expect(page.locator('[data-testid="inventory-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="new-inventory-button"]')).toBeVisible();
    
    console.log(`✅ INV-006: Lista de inventários carregada em ${loadTime}ms`);
  });
});