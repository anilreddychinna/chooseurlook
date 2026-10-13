import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bootstrap from './main.server';
import { environment } from './environments/environment';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');

const app = express();
const commonEngine = new CommonEngine();

app.get('/robots.txt', (req, res) => {
  const origin = `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /cart\nDisallow: /checkout\nDisallow: /auth\n\nSitemap: ${origin}/sitemap.xml\n`,
  );
});

app.get('/sitemap.xml', async (req, res, next) => {
  try {
    const origin = `${req.protocol}://${req.get('host')}`;
    const paths = ['/', '/shop', '/about', '/shipping', '/returns', '/privacy', '/terms'];
    if (environment.supabaseUrl && environment.supabaseAnonKey) {
      const headers = {
        apikey: environment.supabaseAnonKey,
        Authorization: `Bearer ${environment.supabaseAnonKey}`,
      };
      const [products, categories] = await Promise.all([
        fetch(`${environment.supabaseUrl}/rest/v1/products?select=slug&status=eq.published`, { headers }),
        fetch(`${environment.supabaseUrl}/rest/v1/categories?select=slug&is_active=eq.true`, { headers }),
      ]);
      if (products.ok) {
        const rows = await products.json() as { slug: string }[];
        paths.push(...rows.map((row) => `/p/${row.slug}`));
      }
      if (categories.ok) {
        const rows = await categories.json() as { slug: string }[];
        paths.push(...rows.map((row) => `/c/${row.slug}`));
      }
    }
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
      paths.map((path) => `  <url><loc>${origin}${path}</loc></url>`).join('\n')
    }\n</urlset>`;
    res.type('application/xml').send(body);
  } catch (error) {
    next(error);
  }
});

app.get('**', express.static(browserDistFolder, { maxAge: '1y', index: 'index.html' }));

app.get('**', (req, res, next) => {
  const { protocol, originalUrl, baseUrl, headers } = req;
  commonEngine
    .render({
      bootstrap,
      documentFilePath: indexHtml,
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
    })
    .then((html) => res.send(html))
    .catch((err) => next(err));
});

if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export default app;
