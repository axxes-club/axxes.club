// AXXES.app public site: the load balancer rewrites axxes.app paths into /app/*.
// These rules keep search engines on the canonical host and give real 404s
// instead of the landing page's catch-all.
const path = require('path');
const fs = require('fs');
const express = require('express');

const CANONICAL_HOST = 'axxes.app';
const APP_PAGES = new Set(['/app.html', '/app-products.html']);

function mountAppSite(app, publicDir) {
    const appDir = path.join(publicDir, 'app');
    const notFound = (res) => res.status(404).sendFile(path.join(appDir, '404.html'));

    // The same files are reachable on other hosts (axxes.club/app/...); only axxes.app is indexable.
    app.use((req, res, next) => {
        if ((req.path.startsWith('/app/') || APP_PAGES.has(req.path)) && req.hostname !== CANONICAL_HOST) {
            res.set('X-Robots-Tag', 'noindex');
        }
        next();
    });

    // Fonts never change in place; other assets (icons, share images) may be re-rendered.
    app.use('/app/assets', express.static(path.join(appDir, 'assets'), {
        fallthrough: true,
        setHeaders(res, file) {
            res.set('Cache-Control', /\/fonts\//.test(file) ? 'public, max-age=31536000, immutable' : 'public, max-age=86400');
        },
    }));

    app.get('/app/products/:slug', (req, res) => {
        const { slug } = req.params;
        const file = path.join(appDir, 'products', slug + '.html');
        if (!/^[a-z0-9-]+$/.test(slug) || !fs.existsSync(file)) return notFound(res);
        res.sendFile(file);
    });

    // Anything else under /app/ that static files did not answer is missing, not the Club homepage.
    app.use('/app', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        express.static(appDir, { index: false })(req, res, () => notFound(res));
    });
}

module.exports = { mountAppSite, CANONICAL_HOST };
