/**
 * CRA copies public/swSetup.js without a content hash. Browsers and CDNs may
 * keep serving an old copy. After each build, give swSetup.js a unique URL so
 * every deploy fetches fresh bootstrap + update logic.
 */
const fs = require('fs');
const path = require('path');

const buildIndex = path.join(__dirname, '..', 'build', 'index.html');
if (!fs.existsSync(buildIndex)) {
  console.error('stamp-swSetup: build/index.html not found. Run react-scripts build first.');
  process.exit(1);
}

const stamp = process.env.BGL_DEPLOY_STAMP || String(Date.now());
let html = fs.readFileSync(buildIndex, 'utf8');

const next = html.replace(
  /src="([^"]*swSetup\.js)(?:\?[^"]*)?"/g,
  (_, base) => `src="${base}?deploy=${encodeURIComponent(stamp)}"`
);

if (next === html) {
  console.warn('stamp-swSetup: no swSetup.js script tag found in build/index.html');
} else {
  fs.writeFileSync(buildIndex, next, 'utf8');
  console.log('stamp-swSetup: tagged swSetup.js with deploy=' + stamp);
}
