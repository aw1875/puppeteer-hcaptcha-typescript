## hCaptcha solver for puppeteer written in Typescript

Typescript version of [puppeteer-hcaptcha](https://github.com/aw1875/puppeteer-hcaptcha). See original repo for all documentation.

## Usage

```javascript
await hcaptcha(page);
```

- `page` [&lt;Page&gt;](https://pptr.dev/#?product=Puppeteer&version=v12.0.1&show=api-class-page) - Puppeteer Page Instance

```javascript
await hcaptchaToken(url);
```

- `url` [&lt;string&gt;](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) - URL of page with captcha on it

### Automatically set respone value

```typescript
// Require puppeteer extra and puppeteer stealth
const puppeteer = require("puppeteer-extra");
const pluginStealth = require("puppeteer-extra-plugin-stealth");

// Require our hcaptcha method (assuming your file is in the root directory)
const { hcaptcha } = require("./src/puppeteer-hcaptcha");

// Tell puppeteer to use puppeteer stealth
puppeteer.use(pluginStealth());

(async () => {
  // Instantiate a new browser object
  // Ignore errors associated to https
  // Can be headless but for example sake we want to show the browser
  // Set your desired arguments for your puppeteer browser
  const browser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
    headless: false,
    args: [
      `--window-size=600,1000`,
      "--window-position=000,000",
      "--disable-dev-shm-usage",
      "--no-sandbox",
      '--user-data-dir="/tmp/chromium"',
      "--disable-web-security",
      "--disable-features=site-per-process",
    ],
  });

  // Get browser pages
  const [page] = await browser.pages();

  // Send page to your url
  await page.goto("URL OF PAGE WITH CAPTCHA ON IT");

  // Remove the page's default timeout function
  await page.setDefaultNavigationTimeout(0);

  // Call hcaptcha method passing in our page
  await hcaptcha(page);

  // Your page is ready to submit.
  // Captcha solving should be the last function on your page so we
  // don't have to worry about the response token expiring.
  /**
   * Example:
   * await page.click("loginDiv > loginBtn");
   */
})();
```

### Return response token only

```javascript
// Require our hcaptchaToken method (assuming your file is in the root directory)
const { hcaptchaToken } = require("./src/puppeteer-hcaptcha");

(async () => {
  // Create Start Time
  const startTime = Date.now();

  // Call hcaptchaToken method passing in your url
  let token = await hcaptchaToken("URL OF PAGE WITH CAPTCHA ON IT");

  // Get End Time
  const endTime = Date.now();

  // Log timed result to console
  console.log(`Completed in ${(endTime - startTime) / 1000} seconds`);

  // P0_eyJ0eXAiOiJ...
  console.log(token);
})();
```

## Known Issues

```bash
I tensorflow/core/platform/cpu_feature_guard.cc:142] This TensorFlow binary is optimized with oneAPI Deep Neural Network Library (oneDNN) to use the following CPU instructions in performance-critical operations:  AVX2
To enable them in other operations, rebuild TensorFlow with the appropriate compiler flags.
```

Stems from TensorFlow. Not entirely sure how to fix this but it doesn't impact the solver.
