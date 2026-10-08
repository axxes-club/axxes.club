# Native AXXES.app homepage

Payments already links to `https://axxes.app`. The load balancer previously redirected that root to `members.axxes.club`, causing Discover AXXES to leave the App domain.

`public/app.html` provides the native general-use App homepage with approved AXXES.app positioning and links to App products. It contains no Club links. `Dockerfile.app-domain` adds only this public file to the immutable marketing image already deployed before this fix; existing Club content/server/configuration are preserved. `cloudbuild.app-domain.yaml` verifies the App and Club pages through actual Linux HTTP requests.

Build: `6396c1ae-2514-4bf4-98d3-070dc1b202f4` (SUCCESS). Image: `us-west1-docker.pkg.dev/gravy-meta/ci-axxes-club/axxes-club:app-domain-6396c1ae-2514-4bf4-98d3-070dc1b202f4`. Runtime: `axxes-club-app-domain-6396c1a`, same marketing service, environment and identity configuration.

`axxes-lb` matcher `dns-fix-axxes-app` now has an exact `/` path rule using `axxes-club-be` and rewriting the upstream path to `/app.html`. The browser URL remains `https://axxes.app/`. Other App paths retain the existing portal handoff. `dns-fix-www-axxes-app` redirects to `axxes.app`. Other host rules and matchers are preserved. TLS and DNS remain unchanged.

Verify the root returns HTTP 200 with an AXXES.app title and no Location redirect; www reaches this root; the Payments Discover click ends on App; Club root still serves its existing content. The route proposal was validated against Google Cloud's URL map API and independently reviewed before applying.
