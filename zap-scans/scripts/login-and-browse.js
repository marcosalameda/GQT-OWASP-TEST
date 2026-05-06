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
  const LOGIN_URL = BASE_URL;

  // Proxy control (ONLY browser-level, never global)
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

  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  /* =====================================================
     LOGIN (ROBUST + IFRAME AWARE)
     ===================================================== */

  console.log('▶ Opening login page...');
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // Diagnostic screenshot (useful if login fails)
  await page.screenshot({ path: 'login-error.png', fullPage: true });

  // Detect iframe if present
  let loginContext = page;
  const frames = page.frames();

  if (frames.length > 1) {
    console.log('▶ Login iframe detected');
    const candidate = frames.find(f =>
      f.url().startsWith(LOGIN_URL) || f.url().includes('login')
    );
    if (candidate) {
      loginContext = candidate;
    }
  }

  // Wait for password field (very tolerant selector)
  await loginContext.waitForSelector(
    'input[type="password"], input[name*="pass"], input[id*="pass"], input[autocomplete*="password"]',
    { timeout: 180000 }
  );

  // Fill username
  await loginContext
    .locator('input[type="text"], input[type="email"]')
    .first()
    .fill(USER);

  // Fill password
  await loginContext
    .locator('input[type="password"], input[name*="pass"], input[id*="pass"], input[autocomplete*="password"]')
    .first()
    .fill(PASS);

  // Submit login
  await loginContext
    .locator('button[type="submit"], button:has-text("Log"), button:has-text("Entrar")')
    .first()
    .click();

  // Wait for authenticated state
  await page.waitForLoadState('networkidle');

  /* =====================================================
     AUTHENTICATED NAVIGATION (BASELINE TRAFFIC FOR ZAP)
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
    await page.waitForTimeout(2000); // give ZAP time to process traffic
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
