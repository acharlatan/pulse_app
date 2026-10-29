# Living Constellation — visual update

Home, Network and Orbit have new responsive compositions in the existing local-first app. Home has an expanded opening and a Three.js sculpture; Network opens with a portrait-led overview, recent conversations, and a card directory with the compact list still available. Orbit retains the bounded saved-association map and semantic list, now presented on a dimensional stage. Its mobile map starts closer for readability; Fit network, pan and list remain available.

The Three.js artwork is decorative: it does not encode or infer relationships. The existing map nodes and edges continue to represent actual saved records and associations. Artwork is locally rendered, lazily loaded, and has a CSS fallback; reduced motion produces a still scene. Animation pauses while the scene is offscreen or the tab is hidden. No schema, backup, data storage or external account changes were made. The dark theme now uses more distinct background and surface colors.

Validation includes typecheck, lint, 199 unit tests, a clean production build, responsive and axe checks in light and dark at 320–1440px, map and directory interaction tests, and offline/update regression checks. Automated Chromium checks do not establish physical-device, screen-reader or full accessibility conformance.
