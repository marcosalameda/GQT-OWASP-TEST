const { chromium } = require('playwright');

(async () => {
  /* =====================================================
     CONFIGURATION
     ===================================================== */

  const USER = process.env.QUIDGEST_USER;
  const PASS = process.env.QUIDGEST_PASS;

  if (!USER || !PASS) {
    console.error('❌ Missing credentials (QUIDGEST_USER / QUIDGEST_PASS)');
    process.exit(1);
  }

  const BASE_URL = 'https://jenkinsvm.quidgest.pt/gqt_vertical_vue/';
  const LOGIN_URL = BASE_URL; // login page is base SPA entry

  // Enable ZAP proxy only when explicitly requested
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
     LAUNCH BROWSER
     ===================================================== */

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  /* =====================================================
     LOGIN
     ===================================================== */

  console.log('▶ Opening login page...');
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // Screenshot for diagnostics (useful if Jenkins fails)
  await page.screenshot({ path: 'login-error.png', fullPage: true });

  // Wait for password field (robust selector)
  await page.waitForSelector(
    'input[type="password"], input[name*="pass"], input[id*="pass"]',
    { timeout: 180000 }
  );

  // Fill username
  await page
    .locator('input[type="text"], input[type="email"]')
    .first()
    .fill(USER);

  // Fill password (robust)
  await page
    .locator('input[type="password"], input[name*="pass"], input[id*="pass"]')
    .first()
    .fill(PASS);

  // Submit login form (robust button selector)
  await page
    .locator('button[type="submit"], button:has-text("Log"), button:has-text("Entrar")')
    .first()
    .click();

  // Wait for post-login navigation
  await page.waitForLoadState('networkidle');

  /* =====================================================
     AUTHENTICATED NAVIGATION (BASELINE)
     ===================================================== */

  const baseHash = `${BASE_URL}#`;
  const routes = [
    '/dashboard',
    '/home',
    '/list',
    '/admin',
    '/menu'
  ];

  console.log('▶ Browsing authenticated routes...');
  for (const route of routes) {
    console.log(`  → ${route}`);
    await page.goto(`${baseHash}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
  }

  /* =====================================================
     SESSION VALIDATION
     ===================================================== */

  const cookies = await context.cookies();
  const authCookie = cookies.find(c =>
    c.name.toLowerCase().includes('aspxauth')
  );

  if (authCookie) {
    console.log('✅ Authenticated session successfully established');
  } else {
    console.error('❌ Authentication cookie not found');
  }

  await browser.close();
})();
