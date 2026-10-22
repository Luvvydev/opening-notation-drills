const fs = require('fs');
const path = require('path');

// Use the compiled HTML so each entry page loads the current hashed assets.
const buildDirectory = path.resolve(__dirname, '..', 'build');
const indexHtml = fs.readFileSync(path.join(buildDirectory, 'index.html'));

// GitHub Pages serves these directories directly instead of its 404 fallback.
const routes = [
  'signup', 'my-games', 'review', 'login', 'profile',
  'openings', 'openings/library', 'practice', 'demo',
  'about', 'leaderboards', 'install', 'discord',
  'payment/success', 'payment/cancel'
];

for (const route of routes) {
  const routeDirectory = path.join(buildDirectory, route);
  fs.mkdirSync(routeDirectory, { recursive: true });
  fs.writeFileSync(path.join(routeDirectory, 'index.html'), indexHtml);
}

console.log(`Created direct entry pages for ${routes.length} app routes.`);
