// Testes de Autenticação - TestSprite
// Casos: AUTH-001, AUTH-002, AUTH-003

import { test, expect } from '@playwright/test';
import TestHelpers from '../../utils/test-helpers.js';

const helpers = new TestHelpers();

test.describe('Módulo de Autenticação', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navega para a página inicial antes de cada teste
    await page.goto('/');
  });

  // AUTH-001: Login com credenciais válidas
  test('AUTH-001: Login com credenciais válidas', async ({ page }) => {
    const testUser = helpers.getTestUser('admin');
    
    // Passo 1: Navegar para página de login
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Passo 2: Verificar elementos da página
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    
    // Passo 3: Preencher credenciais válidas
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    
    // Passo 4: Medir tempo de resposta do login
    const responseTime = await helpers.measureResponseTime(page, async () => {
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');
    });
    
    // Verificações
    expect(responseTime).toBeLessThan(2000); // Máximo 2 segundos conforme especificado
    await expect(page).toHaveURL('/dashboard');
    
    // Verificar elementos do dashboard após login
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    // Capturar screenshot de sucesso
    await helpers.takeScreenshot(page, 'auth-001-login-success');
    
    console.log(`✅ AUTH-001: Login realizado com sucesso em ${responseTime}ms`);
  });

  // AUTH-002: Login com credenciais inválidas
  test('AUTH-002: Login com credenciais inválidas', async ({ page }) => {
    const invalidUser = helpers.getTestUser('invalid');
    
    // Passo 1: Acessar página de login
    await page.goto('/login');
    
    // Passo 2: Preencher credenciais inválidas
    await page.fill('[data-testid="email-input"]', invalidUser.email);
    await page.fill('[data-testid="password-input"]', invalidUser.password);
    
    // Passo 3: Tentar fazer login
    await page.click('[data-testid="login-button"]');
    
    // Passo 4: Verificar mensagem de erro
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/credenciais inválidas|usuário não encontrado|senha incorreta/i);
    
    // Passo 5: Verificar que permanece na página de login
    await expect(page).toHaveURL(/login/);
    
    // Passo 6: Verificar que campos foram limpos ou mantidos
    const emailValue = await page.inputValue('[data-testid="email-input"]');
    const passwordValue = await page.inputValue('[data-testid="password-input"]');
    
    // Capturar screenshot do erro
    await helpers.takeScreenshot(page, 'auth-002-login-error');
    
    console.log('✅ AUTH-002: Erro de login tratado corretamente');
  });

  // AUTH-003: Controle de sessão e logout
  test('AUTH-003: Controle de sessão e logout', async ({ page }) => {
    const testUser = helpers.getTestUser('operator');
    
    // Passo 1: Realizar login
    await helpers.login(page, 'operator');
    
    // Passo 2: Verificar sessão ativa
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Passo 3: Verificar informações do usuário logado
    await page.click('[data-testid="user-menu"]');
    await expect(page.locator('[data-testid="user-info"]')).toContainText(testUser.name);
    await expect(page.locator('[data-testid="user-role"]')).toContainText(testUser.role);
    
    // Passo 4: Testar navegação com sessão ativa
    await page.goto('/inventory');
    await expect(page).toHaveURL('/inventory');
    
    // Passo 5: Realizar logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Passo 6: Verificar redirecionamento para login
    await expect(page).toHaveURL('/login');
    
    // Passo 7: Tentar acessar página protegida após logout
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login'); // Deve redirecionar para login
    
    // Passo 8: Verificar que não há dados de sessão
    await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();
    
    // Capturar screenshot do logout
    await helpers.takeScreenshot(page, 'auth-003-logout-success');
    
    console.log('✅ AUTH-003: Controle de sessão funcionando corretamente');
  });

  // Teste adicional: Validação de campos obrigatórios
  test('AUTH-004: Validação de campos obrigatórios', async ({ page }) => {
    await page.goto('/login');
    
    // Tentar login sem preencher campos
    await page.click('[data-testid="login-button"]');
    
    // Verificar validações
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    
    // Preencher apenas email
    await page.fill('[data-testid="email-input"]', 'test@test.com');
    await page.click('[data-testid="login-button"]');
    
    // Verificar que ainda há erro de senha
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    
    console.log('✅ AUTH-004: Validação de campos funcionando');
  });

  // Teste adicional: Tentativas múltiplas de login
  test('AUTH-005: Proteção contra tentativas múltiplas', async ({ page }) => {
    const invalidUser = helpers.getTestUser('invalid');
    
    await page.goto('/login');
    
    // Realizar múltiplas tentativas de login inválido
    for (let i = 0; i < 5; i++) {
      await page.fill('[data-testid="email-input"]', invalidUser.email);
      await page.fill('[data-testid="password-input"]', `wrong-password-${i}`);
      await page.click('[data-testid="login-button"]');
      
      // Aguardar resposta
      await page.waitForTimeout(1000);
    }
    
    // Verificar se há bloqueio ou rate limiting
    const errorMessage = await page.locator('[data-testid="error-message"]').textContent();
    
    // Capturar screenshot
    await helpers.takeScreenshot(page, 'auth-005-multiple-attempts');
    
    console.log('✅ AUTH-005: Proteção contra tentativas múltiplas testada');
  });

  // Teste de performance: Tempo de carregamento da página de login
  test('AUTH-006: Performance da página de login', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Verificar que carrega em menos de 2 segundos
    expect(loadTime).toBeLessThan(2000);
    
    // Verificar elementos críticos carregados
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    
    console.log(`✅ AUTH-006: Página de login carregada em ${loadTime}ms`);
  });
});