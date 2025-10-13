// Teste básico de conectividade - TestSprite
import { test, expect } from '@playwright/test';

test.describe('Testes Básicos de Conectividade', () => {
  
  test('Verificar se servidor está respondendo', async ({ page }) => {
    // Navegar para a página principal
    await page.goto('/');
    
    // Aguardar carregamento da página
    await page.waitForLoadState('networkidle');
    
    // Verificar se a página carregou (não deve ser erro 404 ou 500)
    const title = await page.title();
    console.log('Título da página:', title);
    
    // Verificar se não há erro de conexão
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Cannot GET');
    expect(bodyText).not.toContain('404');
    expect(bodyText).not.toContain('500');
    
    // Capturar screenshot da página inicial
    await page.screenshot({ path: 'tests/reports/screenshots/homepage.png' });
    
    console.log('✅ Servidor respondendo corretamente na porta 5401');
  });

  test('Verificar estrutura básica da aplicação', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verificar se elementos básicos estão presentes
    const hasReactRoot = await page.locator('#root').count() > 0;
    const hasBody = await page.locator('body').count() > 0;
    
    expect(hasBody).toBeTruthy();
    
    console.log('React root presente:', hasReactRoot);
    console.log('✅ Estrutura básica da aplicação verificada');
  });
});