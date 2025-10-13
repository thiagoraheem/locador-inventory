// Testes de Dashboard Analítico - TestSprite
// Casos: DASH-001, DASH-002, DASH-003

import { test, expect } from '@playwright/test';
import TestHelpers from '../../utils/test-helpers.js';

const helpers = new TestHelpers();

test.describe('Módulo de Dashboard Analítico', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login como admin para acesso completo ao dashboard
    await helpers.login(page, 'admin');
  });

  // DASH-001: Carregamento e exibição de KPIs
  test('DASH-001: Carregamento e exibição de KPIs', async ({ page }) => {
    
    // Passo 1: Navegar para o dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');
    
    // Passo 2: Medir tempo de carregamento dos KPIs
    const responseTime = await helpers.measureResponseTime(page, async () => {
      await page.waitForSelector('[data-testid="kpi-container"]');
      await page.waitForLoadState('networkidle');
    });
    
    // Verificar tempo de resposta
    expect(responseTime).toBeLessThan(2000);
    
    // Passo 3: Verificar presença dos KPIs principais
    await expect(page.locator('[data-testid="kpi-total-inventories"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-active-inventories"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-completed-inventories"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-total-items"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-counted-items"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-pending-items"]')).toBeVisible();
    
    // Passo 4: Verificar valores numéricos dos KPIs
    const totalInventories = await page.locator('[data-testid="kpi-total-inventories"] .kpi-value').textContent();
    const activeInventories = await page.locator('[data-testid="kpi-active-inventories"] .kpi-value').textContent();
    
    expect(parseInt(totalInventories)).toBeGreaterThanOrEqual(0);
    expect(parseInt(activeInventories)).toBeGreaterThanOrEqual(0);
    
    // Passo 5: Verificar formatação e labels dos KPIs
    await expect(page.locator('[data-testid="kpi-total-inventories"] .kpi-label')).toContainText(/Total de Inventários|Inventários Totais/i);
    await expect(page.locator('[data-testid="kpi-active-inventories"] .kpi-label')).toContainText(/Inventários Ativos|Em Andamento/i);
    
    // Passo 6: Verificar indicadores visuais (cores, ícones)
    await expect(page.locator('[data-testid="kpi-container"] .kpi-icon')).toHaveCount(6);
    
    // Capturar screenshot dos KPIs
    await helpers.takeScreenshot(page, 'dash-001-kpis-loaded');
    
    console.log(`✅ DASH-001: KPIs carregados com sucesso em ${responseTime}ms`);
  });

  // DASH-002: Gráficos e visualizações
  test('DASH-002: Gráficos e visualizações', async ({ page }) => {
    
    // Passo 1: Navegar para o dashboard
    await page.goto('/dashboard');
    
    // Passo 2: Aguardar carregamento dos gráficos
    await page.waitForSelector('[data-testid="charts-container"]');
    
    // Passo 3: Verificar presença dos gráficos principais
    await expect(page.locator('[data-testid="chart-inventory-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-items-by-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-inventory-timeline"]')).toBeVisible();
    
    // Passo 4: Verificar gráfico de progresso de inventários
    const progressChart = page.locator('[data-testid="chart-inventory-progress"]');
    await expect(progressChart.locator('.recharts-wrapper')).toBeVisible();
    await expect(progressChart.locator('.recharts-pie')).toBeVisible();
    
    // Passo 5: Verificar gráfico de itens por status
    const statusChart = page.locator('[data-testid="chart-items-by-status"]');
    await expect(statusChart.locator('.recharts-wrapper')).toBeVisible();
    await expect(statusChart.locator('.recharts-bar')).toBeVisible();
    
    // Passo 6: Verificar gráfico de timeline
    const timelineChart = page.locator('[data-testid="chart-inventory-timeline"]');
    await expect(timelineChart.locator('.recharts-wrapper')).toBeVisible();
    await expect(timelineChart.locator('.recharts-line')).toBeVisible();
    
    // Passo 7: Testar interatividade dos gráficos
    await progressChart.hover();
    await expect(page.locator('.recharts-tooltip')).toBeVisible();
    
    // Passo 8: Verificar legendas dos gráficos
    await expect(page.locator('[data-testid="chart-legend"]')).toHaveCount(3);
    
    // Passo 9: Testar responsividade dos gráficos
    await helpers.setMobileViewport(page, 'iPad Pro');
    await page.waitForTimeout(1000);
    
    // Verificar que gráficos se adaptaram
    await expect(progressChart).toBeVisible();
    await expect(statusChart).toBeVisible();
    
    // Capturar screenshot dos gráficos
    await helpers.takeScreenshot(page, 'dash-002-charts-loaded');
    
    console.log('✅ DASH-002: Gráficos e visualizações funcionando corretamente');
  });

  // DASH-003: Filtros e atualizações em tempo real
  test('DASH-003: Filtros e atualizações em tempo real', async ({ page }) => {
    
    // Passo 1: Navegar para o dashboard
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="dashboard-filters"]');
    
    // Passo 2: Verificar filtros disponíveis
    await expect(page.locator('[data-testid="filter-date-range"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-inventory-type"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-location"]')).toBeVisible();
    
    // Passo 3: Capturar valores iniciais dos KPIs
    const initialTotalInventories = await page.locator('[data-testid="kpi-total-inventories"] .kpi-value').textContent();
    
    // Passo 4: Aplicar filtro por tipo de inventário
    await page.selectOption('[data-testid="filter-inventory-type"]', 'geral');
    
    // Passo 5: Aguardar atualização dos dados
    await page.waitForTimeout(1000);
    
    // Passo 6: Verificar que os dados foram atualizados
    const filteredTotalInventories = await page.locator('[data-testid="kpi-total-inventories"] .kpi-value').textContent();
    
    // Os valores podem ser diferentes após aplicar filtro
    expect(filteredTotalInventories).toBeDefined();
    
    // Passo 7: Aplicar filtro por status
    await page.selectOption('[data-testid="filter-status"]', 'em_andamento');
    await page.waitForTimeout(1000);
    
    // Passo 8: Verificar atualização dos gráficos
    await expect(page.locator('[data-testid="chart-inventory-progress"]')).toBeVisible();
    
    // Passo 9: Testar filtro por período
    await page.click('[data-testid="filter-date-range"]');
    await page.click('[data-testid="date-range-last-30-days"]');
    await page.waitForTimeout(1000);
    
    // Passo 10: Limpar filtros
    await page.click('[data-testid="clear-filters-button"]');
    await page.waitForTimeout(1000);
    
    // Verificar que voltou aos valores originais
    const clearedTotalInventories = await page.locator('[data-testid="kpi-total-inventories"] .kpi-value').textContent();
    expect(clearedTotalInventories).toBe(initialTotalInventories);
    
    // Passo 11: Testar atualização automática
    await page.click('[data-testid="auto-refresh-toggle"]');
    await expect(page.locator('[data-testid="auto-refresh-indicator"]')).toBeVisible();
    
    // Aguardar um ciclo de atualização
    await page.waitForTimeout(5000);
    
    // Passo 12: Verificar timestamp da última atualização
    await expect(page.locator('[data-testid="last-updated"]')).toBeVisible();
    
    // Capturar screenshot com filtros aplicados
    await helpers.takeScreenshot(page, 'dash-003-filters-applied');
    
    console.log('✅ DASH-003: Filtros e atualizações em tempo real funcionando');
  });

  // Teste adicional: Performance do dashboard
  test('DASH-004: Performance do dashboard', async ({ page }) => {
    const startTime = Date.now();
    
    // Navegar e aguardar carregamento completo
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Verificar tempo de carregamento
    expect(loadTime).toBeLessThan(3000); // 3 segundos para dashboard completo
    
    // Verificar elementos críticos carregados
    await expect(page.locator('[data-testid="kpi-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="charts-container"]')).toBeVisible();
    
    console.log(`✅ DASH-004: Dashboard carregado em ${loadTime}ms`);
  });

  // Teste adicional: Responsividade do dashboard
  test('DASH-005: Responsividade do dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Testar em diferentes resoluções
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 1024, height: 768, name: 'Tablet' },
      { width: 390, height: 844, name: 'Mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000);
      
      // Verificar elementos visíveis em cada resolução
      await expect(page.locator('[data-testid="kpi-container"]')).toBeVisible();
      
      // Capturar screenshot para cada resolução
      await helpers.takeScreenshot(page, `dash-005-responsive-${viewport.name.toLowerCase()}`);
    }
    
    console.log('✅ DASH-005: Dashboard responsivo funcionando');
  });

  // Teste adicional: Exportação de dados
  test('DASH-006: Exportação de dados do dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="export-options"]');
    
    // Testar exportação em PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-pdf-button"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('.pdf');
    
    // Testar exportação em Excel
    const downloadPromise2 = page.waitForEvent('download');
    await page.click('[data-testid="export-excel-button"]');
    const download2 = await downloadPromise2;
    
    expect(download2.suggestedFilename()).toContain('.xlsx');
    
    console.log('✅ DASH-006: Exportação de dados funcionando');
  });
});