/**
 * Branded neutral placeholder used while an image is loading or when a
 * category/product has no image at all. Renders as a dark-luxury solid
 * with a subtle burgundy → wine gradient plus a very faint centered "SG"
 * emblem — no external network call and no third-party stock imagery.
 *
 * Encoded as a data URI so <img src> resolves synchronously with zero
 * layout shift and no Unsplash / CDN fetch.
 */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500" preserveAspectRatio="xMidYMid slice">
  <defs>
    <radialGradient id="g" cx="50%" cy="45%" r="75%">
      <stop offset="0%" stop-color="#301118"/>
      <stop offset="65%" stop-color="#1d0a11"/>
      <stop offset="100%" stop-color="#120609"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"  stop-color="#8a6a2a" stop-opacity="0.35"/>
      <stop offset="50%" stop-color="#d4af37" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#8a6a2a" stop-opacity="0.35"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1500" fill="url(#g)"/>
  <g opacity="0.35" transform="translate(600 730)">
    <circle r="140" fill="none" stroke="url(#gold)" stroke-width="1.25"/>
    <circle r="175" fill="none" stroke="url(#gold)" stroke-width="0.75" opacity="0.6"/>
    <text x="0" y="14" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="72" font-style="italic" fill="url(#gold)" letter-spacing="6">SG</text>
  </g>
  <text x="600" y="900" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="24" letter-spacing="6" fill="#bf9972" opacity="0.35">SAMRAT GLASS</text>
</svg>`;

// Compact whitespace and URL-encode the essentials so the URI is short.
const compact = svg.replace(/\n\s+/g, " ").trim();
export const BRAND_PLACEHOLDER =
  `data:image/svg+xml;utf8,${encodeURIComponent(compact)}`;

// A darker, no-emblem variant used behind the hero (which will layer
// its own gradient/overlay on top, so any emblem would visually clash).
const svgHero = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
  <defs>
    <radialGradient id="h" cx="65%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#3a1620"/>
      <stop offset="55%" stop-color="#1d0a11"/>
      <stop offset="100%" stop-color="#0e0509"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#h)"/>
</svg>`;
export const BRAND_PLACEHOLDER_HERO =
  `data:image/svg+xml;utf8,${encodeURIComponent(svgHero.replace(/\n\s+/g, " ").trim())}`;
