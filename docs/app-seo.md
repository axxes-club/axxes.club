# axxes.app SEO

Everything public on axxes.app is generated from `scripts/app-catalog.json` and the homepage template `public/app.html`.

```bash
node scripts/build-app-catalog.cjs     # pages, footer, sitemap, robots, manifest, 404
PLAYWRIGHT_CORE=… CHROMIUM=… node scripts/render-app-images.cjs   # icons + 1200x630 share images (committed)
npm test                               # SEO checks + server routing
```

Each catalog entry needs `slug`, `seoTitle` (≤65 chars), `metaDescription` (70–160), `tagline`, `intro`, `capabilities`, `goodFor`, `related`, `category` and `icon`. Copy must describe what is live, not what is planned. The build refuses products the owner does not promote (Matter, Krates, AXXES Cloud, AXXES Payments) and anything "In development".

## Serving

The `axxes-lb` matcher `dns-fix-axxes-app` rewrites axxes.app paths onto this service:

| axxes.app path | served file |
| --- | --- |
| `/` | `/app.html` |
| `/products` | `/app-products.html` |
| `/products/<slug>` | `/app/products/<slug>` → `public/app/products/<slug>.html` |
| `/assets/*` | `/app/assets/*` (fonts cached a year, images a day) |
| `/robots.txt`, `/sitemap.xml`, `/site.webmanifest`, IndexNow key | `/app/…` |
| `/favicon.ico`, `/apple-touch-icon.png` | `/app/assets/…` |

Anything else on axxes.app keeps the portal redirect. `app-site.cjs` returns real 404s under `/app/` and sends `X-Robots-Tag: noindex` when these files are fetched on any host other than axxes.app. Cloud CDN caches axxes.app: invalidate `/*` on host axxes.app after a release that changes pages.

## After a release

Submit changed URLs to IndexNow (Bing, Yandex, Seznam, Naver) with the key in `scripts/app-pages.json`. Google Search Console needs the site verified once (DNS TXT on axxes.app), then the sitemap submitted at `https://axxes.app/sitemap.xml`.
