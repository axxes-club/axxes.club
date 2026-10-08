# AXXES App story and catalog

AXXES is the parent platform. AXXES.club is its entertainment product, with its own internal integrations. The public App website and shared App switcher must not advertise Club. This is a presentation boundary, not a change to internal product keys, tenant data or integration access. General products still using legacy `.club` hosts remain valid destinations.

The homepage keeps its existing branding and hero. A new audience section explains AXXES through For You, For Work and For Life. Its labels are noninteractive. Content advances every eight seconds while visible, with a separate reading pause control. Reduced-motion and JavaScript-disabled browsers show all three sections as ordinary content.

`/products` lists the App-facing products, shared services, independent brands, custom work and internal operations. Every card explains a concrete use and an honest availability status. Customer properties are not represented as AXXES-owned brands. Matter describes client matters, not property management. AXXES Pay collects for merchants; AXXES Payments is checkout for AXXES purchases.

`scripts/app-catalog.json` is the curated website catalog. Run `node scripts/build-app-catalog.cjs` from the repository root after editing it. This regenerates the homepage sitemap and the static products page. It does not touch the shared application database catalog.

Deployment overlays only the two public App files onto the pinned marketing image. Cloud Build verifies their actual Linux HTTP responses and preserves the Club homepage. The load balancer adds exact `/products` and `/products/` rewrites to `/app-products.html` on the existing App matcher. Other host routes and the existing deep-path handoff remain unchanged.

Browser checks cover all three automatic states, pause/resume, noninteractive labels, reduced motion, no-JavaScript content, mobile overflow, product count, Club exclusion and runtime errors. Before publication, validate the URL map and compare the live marketing revision against the overlay base. Rollback uses the prior pinned marketing revision; the route backup is saved before applying the fingerprint-protected patch.
