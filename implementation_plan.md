# Optimize Web App Performance and UX

## Goal
Accelerate load times, smooth page transitions, reduce data fetching overhead, and improve video streaming performance.

## User Review Required
[!IMPORTANT]
- **Static/ISR migration** will change rendering strategy for pages (possible breaking changes).
- **New dependencies** (`swr`, `hls.js`, `framer-motion`, `@next/font`).
- **Component API changes** for `EpisodeSelector`, `VideoPlayer`, and page containers.

## Open Questions
[!WARNING]
1. Is the movie/episode data served from an external API or bundled?
2. Do you have a CDN for static assets?
3. Where are the HLS streams hosted? Need caching proxy?
4. Preferred Google Font (e.g., Inter, Roboto, Outfit)?

## Proposed Changes

### 1. Rendering Strategy
- Convert pages to `getStaticProps` / `getStaticPaths` where possible.
- Use ISR (`revalidate: 60`) for frequently updated movies.
- Fallback handling with skeleton loaders.

### 2. Data Fetching
- Add `swr` for client‑side episode fetching and caching.
- Pre‑fetch next movie on hover via `next/link`.

### 3. Images
- Replace `<img>` with `next/image` (lazy load, blur placeholder).
- Update `next.config.js` image domains.

### 4. Fonts
- Use `@next/font/google` to load the chosen font with `display: swap`.

### 5. CSS/JS Bundle
- Ensure tree‑shaking, remove unused classes.
- Add preload headers for critical assets.

### 6. Video Player
- Switch to HLS.js (`react-hls-player` or custom wrapper).
- Add `preload="metadata"`, loading spinner, and `key={episode.link_m3u8}`.

### 7. Page Transitions
- Install `framer-motion` and wrap `_app.tsx` with `AnimatePresence` for fade transitions.

### 8. Misc Optimizations
| Area | Action |
|------|--------|
| Cache‑Control | Set long‑term caching for static assets in `next.config.js` |
| Compression | Ensure gzip/Brotli (default on Vercel) |
| Lazy Load Heavy Components | `next/dynamic` with `ssr: false` for `VideoPlayer` |
| Bundle Size | Remove unused imports |

## Verification Plan
1. Run `npm run build && npm start` – no compile errors.
2. Run Chrome Lighthouse – target Performance > 90.
3. Measure TTFB/FCP before and after.
4. Verify first video frame appears < 2 s after selecting an episode.
5. Manual navigation test – smooth fade transitions, no layout shift.

---
Please answer the open questions and confirm you want us to proceed with these changes.
