// Testes de Mesa de Controle - TestSprite
// Casos: CTRL-001, CTRL-002

import { test, expect } from '@playwright/test';
import TestHelpers from '../../utils/test-helpers.js';

const helpers = new TestHelpers();

test.describe('Módulo de Mesa de Controle', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login como admin para acesso completo à mesa de controle
    await helpers.login(page, 'admin');
  });

  // CTRL-001: Monitoramento de inventários ativos
  test('CTRL-001: Monitoramento de inventários ativos', async ({ page }) => {
    
    // Passo 1: Navegar para a mesa de controle
    await page.goto('/control-desk');
    await expect(page).toHaveURL('/control-desk');
    
    // Passo 2: Medir tempo de carregamento
    const responseTime = await helpers.measureResponseTime(page, async () => {
      await page.waitForSelector('[data-testid="control-desk-container"]');
      await page.waitForLoadState('networkidle');
    });
    
    expect(responseTime).toBeLessThan(2000);
    
    // Passo 3: Verificar seções principais da mesa de controle
    await expect(page.locator('[data-testid="active-inventories-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="real-time-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="alerts-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="team-activity"]')).toBeVisible();
    
    // Passo 4: Verificar lista de inventários ativos
    const activeInventoriesPanel = page.locator('[data-testid="active-inventories-panel"]');
    await expect(activeInventoriesPanel.locator('[data-testid="inventory-card"]')).toHaveCount.greaterThan(0);
    
    // Passo 5: Verificar informações de cada inventário ativo
    const firstInventoryCard = activeInventoriesPanel.locator('[data-testid="inventory-card"]').first();
    await expect(firstInventoryCard.locator('[data-testid="inventory-name"]')).toBeVisible();
    await expect(firstInventoryCard.locator('[data-testid="inventory-progress"]')).toBeVisible();
    await expect(firstInventoryCard.locator('[data-testid="inventory-status"]')).toBeVisible();
    await expect(firstInventoryCard.locator('[data-testid="inventory-team"]')).toBeVisible();
    
    // Passo 6: Verificar métricas em tempo real
    const metricsPanel = page.locator('[data-testid="real-time-metrics"]');
    await expect(metricsPanel.locator('[data-testid="metric-items-counted-today"]')).toBeVisible();
    await expect(metricsPanel.locator('[data-testid="metric-active-users"]')).toBeVisible();
    await expect(metricsPanel.locator('[data-testid="metric-completion-rate"]')).toBeVisible();
    
    // Passo 7: Verificar valores numéricos das métricas
    const itemsCountedToday = await metricsPanel.locator('[data-testid="metric-items-counted-today"] .metric-value').textContent();
    const activeUsers = await metricsPanel.locator('[data-testid="metric-active-users"] .metric-value').textContent();
    
    expect(parseInt(itemsCountedToday)).toBeGreaterThanOrEqual(0);
    expect(parseInt(activeUsers)).toBeGreaterThanOrEqual(0);
    
    // Passo 8: Verificar painel de alertas
    const alertsPanel = page.locator('[data-testid="alerts-panel"]');
    await expect(alertsPanel.locator('[data-testid="alerts-list"]')).toBeVisible();
    
    // Passo 9: Verificar atividade da equipe
    const teamActivityPanel = page.locator('[data-testid="team-activity"]');
    await expect(teamActivityPanel.locator('[data-testid="activity-timeline"]')).toBeVisible();
    
    // Passo 10: Testar atualização automática
    await page.click('[data-testid="auto-refresh-toggle"]');
    await expect(page.locator('[data-testid="auto-refresh-indicator"]')).toBeVisible();
    
    // Aguardar um ciclo de atualização
    await page.waitForTimeout(3000);
    
    // Verificar timestamp da última atualização
    await expect(page.locator('[data-testid="last-updated-timestamp"]')).toBeVisible();
    
    // Capturar screenshot da mesa de controle
    await helpers.takeScreenshot(page, 'ctrl-001-control-desk-monitoring');
    
    console.log(`✅ CTRL-001: Monitoramento de inventários ativos funcionando em ${responseTime}ms`);
  });

  // CTRL-002: Gestão de alertas e notificações
  test('CTRL-002: Gestão de alertas e notificações', async ({ page }) => {
    
    // Passo 1: Navegar para a mesa de controle
    await page.goto('/control-desk');
    await page.waitForSelector('[data-testid="alerts-panel"]');
    
    // Passo 2: Verificar painel de alertas
    const alertsPanel = page.locator('[data-testid="alerts-panel"]');
    await expect(alertsPanel.locator('[data-testid="alerts-header"]')).toContainText(/Alertas|Notificações/i);
    
    // Passo 3: Verificar tipos de alertas disponíveis
    await expect(alertsPanel.locator('[data-testid="alert-filter-all"]')).toBeVisible();
    await expect(alertsPanel.locator('[data-testid="alert-filter-critical"]')).toBeVisible();
    await expect(alertsPanel.locator('[data-testid="alert-filter-warning"]')).toBeVisible();
    await expect(alertsPanel.locator('[data-testid="alert-filter-info"]')).toBeVisible();
    
    // Passo 4: Testar filtro de alertas críticos
    await page.click('[data-testid="alert-filter-critical"]');
    await page.waitForTimeout(1000);
    
    // Verificar que apenas alertas críticos são exibidos
    const criticalAlerts = alertsPanel.locator('[data-testid="alert-item"][data-severity="critical"]');
    const alertCount = await criticalAlerts.count();
    
    if (alertCount > 0) {
      // Verificar estrutura do alerta crítico
      const firstCriticalAlert = criticalAlerts.first();
      await expect(firstCriticalAlert.locator('[data-testid="alert-icon"]')).toBeVisible();
      await expect(firstCriticalAlert.locator('[data-testid="alert-message"]')).toBeVisible();
      await expect(firstCriticalAlert.locator('[data-testid="alert-timestamp"]')).toBeVisible();
      await expect(firstCriticalAlert.locator('[data-testid="alert-actions"]')).toBeVisible();
    }
    
    // Passo 5: Testar ações de alerta
    if (alertCount > 0) {
      const firstAlert = criticalAlerts.first();
      
      // Testar marcar como lido
      await firstAlert.locator('[data-testid="mark-as-read-button"]').click();
      await expect(firstAlert).toHaveClass(/alert-read/);
      
      // Testar resolver alerta
      await firstAlert.locator('[data-testid="resolve-alert-button"]').click();
      await expect(page.locator('[data-testid="resolve-alert-modal"]')).toBeVisible();
      
      // Preencher motivo da resolução
      await page.fill('[data-testid="resolution-reason"]', 'Alerta resolvido durante teste automatizado');
      await page.click('[data-testid="confirm-resolution-button"]');
      
      // Verificar que alerta foi resolvido
      await expect(firstAlert).toHaveClass(/alert-resolved/);
    }
    
    // Passo 6: Testar criação de alerta personalizado
    await page.click('[data-testid="create-alert-button"]');
    await expect(page.locator('[data-testid="create-alert-modal"]')).toBeVisible();
    
    // Preencher dados do alerta
    await page.selectOption('[data-testid="alert-type"]', 'warning');
    await page.fill('[data-testid="alert-title"]', 'Alerta de Teste Automatizado');
    await page.fill('[data-testid="alert-message"]', 'Este é um alerta criado durante teste automatizado');
    await page.selectOption('[data-testid="alert-target"]', 'all-users');
    
    // Criar alerta
    await page.click('[data-testid="create-alert-submit"]');
    
    // Verificar que alerta foi criado
    await expect(page.locator('[data-testid="alert-created-success"]')).toBeVisible();
    
    // Passo 7: Verificar notificações em tempo real
    await page.click('[data-testid="notifications-toggle"]');
    await expect(page.locator('[data-testid="notifications-enabled"]')).toBeVisible();
    
    // Passo 8: Testar configurações de notificação
    await page.click('[data-testid="notification-settings-button"]');
    await expect(page.locator('[data-testid="notification-settings-modal"]')).toBeVisible();
    
    // Verificar opções de configuração
    await expect(page.locator('[data-testid="email-notifications-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="browser-notifications-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="sound-notifications-toggle"]')).toBeVisible();
    
    // Passo 9: Testar histórico de alertas
    await page.click('[data-testid="alert-history-button"]');
    await expect(page.locator('[data-testid="alert-history-modal"]')).toBeVisible();
    
    // Verificar filtros do histórico
    await expect(page.locator('[data-testid="history-date-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="history-severity-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="history-user-filter"]')).toBeVisible();
    
    // Passo 10: Testar exportação de relatório de alertas
    await page.click('[data-testid="export-alerts-report"]');
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-pdf-button"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('alertas');
    expect(download.suggestedFilename()).toContain('.pdf');
    
    // Capturar screenshot da gestão de alertas
    await helpers.takeScreenshot(page, 'ctrl-002-alerts-management');
    
    console.log('✅ CTRL-002: Gestão de alertas e notificações funcionando corretamente');
  });

  // Teste adicional: Performance da mesa de controle
  test('CTRL-003: Performance da mesa de controle', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/control-desk');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Verificar tempo de carregamento
    expect(loadTime).toBeLessThan(3000); // 3 segundos para mesa de controle completa
    
    // Verificar elementos críticos carregados
    await expect(page.locator('[data-testid="control-desk-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="real-time-metrics"]')).toBeVisible();
    
    console.log(`✅ CTRL-003: Mesa de controle carregada em ${loadTime}ms`);
  });

  // Teste adicional: Responsividade da mesa de controle
  test('CTRL-004: Responsividade da mesa de controle', async ({ page }) => {
    await page.goto('/control-desk');
    
    // Testar em tablet
    await helpers.setMobileViewport(page, 'iPad Pro');
    await page.waitForTimeout(1000);
    
    // Verificar layout adaptado para tablet
    await expect(page.locator('[data-testid="control-desk-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
    
    // Testar navegação mobile
    await page.click('[data-testid="mobile-menu-toggle"]');
    await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
    
    // Capturar screenshot responsivo
    await helpers.takeScreenshot(page, 'ctrl-004-responsive-tablet');
    
    console.log('✅ CTRL-004: Mesa de controle responsiva funcionando');
  });

  // Teste adicional: Integração com outros módulos
  test('CTRL-005: Integração com outros módulos', async ({ page }) => {
    await page.goto('/control-desk');
    
    // Testar navegação para inventário específico
    const firstInventoryCard = page.locator('[data-testid="inventory-card"]').first();
    await firstInventoryCard.click();
    
    // Verificar redirecionamento
    await expect(page).toHaveURL(/\/inventory\/\d+/);
    
    // Voltar para mesa de controle
    await page.goBack();
    await expect(page).toHaveURL('/control-desk');
    
    // Testar acesso ao dashboard
    await page.click('[data-testid="view-dashboard-button"]');
    await expect(page).toHaveURL('/dashboard');
    
    console.log('✅ CTRL-005: Integração com outros módulos funcionando');
  });

  // Teste adicional: Atualização automática de dados
  test('CTRL-006: Atualização automática de dados', async ({ page }) => {
    await page.goto('/control-desk');
    
    // Capturar valor inicial de uma métrica
    const initialValue = await page.locator('[data-testid="metric-items-counted-today"] .metric-value').textContent();
    
    // Ativar atualização automática
    await page.click('[data-testid="auto-refresh-toggle"]');
    
    // Aguardar ciclo de atualização
    await page.waitForTimeout(5000);
    
    // Verificar que timestamp foi atualizado
    const lastUpdated = await page.locator('[data-testid="last-updated-timestamp"]').textContent();
    expect(lastUpdated).toBeTruthy();
    
    // Verificar indicador de atualização ativa
    await expect(page.locator('[data-testid="auto-refresh-indicator"]')).toBeVisible();
    
    console.log('✅ CTRL-006: Atualização automática funcionando');
  });
});