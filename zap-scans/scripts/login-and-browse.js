const { chromium } = require('playwright');

(async () => {
  /* =====================================================
     CONFIGURACIÓN
     ===================================================== */

  const USER = process.env.QUIDGEST_USER;
  const PASS = process.env.QUIDGEST_PASS;

  if (!USER || !PASS) {
    console.error('❌ Missing credentials (QUIDGEST_USER / QUIDGEST_PASS)');
    process.exit(1);
  }

  // Activar proxy ZAP solo cuando se indique
  const useProxy = process.env.USE_ZAP_PROXY === 'true';

  const contextOptions = {
    ignoreHTTPSErrors: true
  };

  if (useProxy) {
    contextOptions.proxy = { server: 'http://localhost:8080' };
    console.log('▶ ZAP proxy ENABLED');
  } else {
    console.log('▶ ZAP proxy DISABLED');
  }

  /* =====================================================
     LANZAR NAVEGADOR
     ===================================================== */

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  /* =====================================================
     LOGIN
     ===================================================== */

  const BASE_URL = 'https://jenkinsvm.quidgest.pt/gqt_vertical_vue/';

  console.log('▶ Opening login page...');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  // Esperar a que el formulario esté realmente disponible
  await page.waitForSelector('input[type="password"]', { timeout: 120000 });

  // Rellenar usuario (primer input de texto/email visible)
  await page.locator('input[type="text"], input[type="email"]').first().fill(USER);

  // Rellenar password
  await page.locator('input[type="password"]').fill(PASS);

  // Click en el botón visible del formulario
  await page.locator('#login-btn').click();

  // Dejar tiempo para establecer la sesión
  await page.waitForTimeout(5000);

  /* =====================================================
     NAVEGACIÓN AUTENTICADA (BASELINE)
     ===================================================== */

  const baseHash = `${BASE_URL}#`;
  const routes = [
    '/dashboard',
    '/home',
    '/list'
    // 👉 añade más rutas cuando quieras:
    // '/details/1',
    // '/reports',
    // '/admin'
  ];

  console.log('▶ Browsing authenticated routes...');
  for (const route of routes) {
    console.log(`  → ${route}`);
    await page.goto(`${baseHash}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
  }

  /* =====================================================
     VALIDACIÓN DE SESIÓN
     ===================================================== */

  const cookies = await context.cookies();
  const authCookie = cookies.find(c => c.name.toLowerCase().includes('aspxauth'));

  if (authCookie) {
    console.log('✅ Sesión autenticada correctamente');
  } else {
    console.error('❌ Authentication cookie not found');
  }

  await browser.close();
})();
