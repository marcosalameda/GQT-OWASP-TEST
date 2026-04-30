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

  const BASE_URL = 'https://jenkinsvm.quidgest.pt/gqt_vertical_vue/';

  console.log('▶ Opening login page...');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  // Wait until the login form is fully available
  await page.waitForSelector('input[type="password"]', { timeout: 120000 });

  // Fill username (first visible text/email input)
  await page.locator('input[type="text"], input[type="email"]').first().fill(USER);

  // Fill password
  await page.locator('input[type="password"]').fill(PASS);

  // Click the visible login button
  await page.locator('#login-btn').click();

  // Allow some time for the session to be established
  await page.waitForTimeout(5000);

  /* =====================================================
     AUTHENTICATED NAVIGATION (BASELINE)
     ===================================================== */

  const baseHash = `${BASE_URL}#`;
  const routes = [
    '/dashboard',
    '/home',
    '/list'
    // 👉 add more routes whenever needed:
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
     SESSION VALIDATION
     ===================================================== */

  const cookies = await context.cookies();
  const authCookie = cookies.find(c => c.name.toLowerCase().includes('aspxauth'));

  if (authCookie) {
    console.log('✅ Authenticated session successfully established');
  } else {
    console.error('❌ Authentication cookie not found');
  }

  await browser.close();
})();
