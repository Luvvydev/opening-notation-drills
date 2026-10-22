const fs = require('fs');
const path = require('path');

// Use the compiled HTML so each entry page loads the current hashed assets.
const buildDirectory = path.resolve(__dirname, '..', 'build');
const indexHtml = fs.readFileSync(path.join(buildDirectory, 'index.html'));

// GitHub Pages serves these directories directly instead of its 404 fallback.
for (const route of ['signup', 'my-games']) {
  const routeDirectory = path.join(buildDirectory, route);
  fs.mkdirSync(routeDirectory, { recursive: true });
  fs.writeFileSync(path.join(routeDirectory, 'index.html'), indexHtml);
}

console.log('Created direct entry pages for /signup/ and /my-games/.');
