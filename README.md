# BurgerLab — scroll-driven cinematic landing (reference build)

**Live:** https://burgerlab.facyt.net · fictional dark-luxury burger brand · all food imagery & film AI-generated.

One idea drives the page: **the scroll controls the product film.** A full-screen
background video of The Lab Burger is scrubbed frame-by-frame as you scroll —
assembled at the hero, separating layer-by-layer through the pinned sequence,
held exploded behind the menu, reassembled at the CTA. Everything else
(catalog, ordering drawer, ingredient specs) floats over that film.

This repo is maintained as a **reference** for building this class of dynamic,
motion-driven site: every non-obvious decision is commented at the point of
code, this README explains the system, and the E2E verification harness ships
in `scripts/verify/`.

---

## System map

```
scrollY ──► videoMap.mapTime(anchors, y) ──► clampToBuffered(t, contiguous) ──► #bgv.currentTime
   ▲              pure, 15 unit tests                pure                        all-keyframe H.264
   │
 Lenis (smooth wheel) + ScrollTrigger (pin, reveals, progress)   ← motion.js owns ALL of this
   │
 React (App.jsx) — declarative sections + drawer/cart state
   │
 cart.js — pure immutable order math, 8 unit tests
```

| File | Role |
|---|---|
| `src/motion.js` | Single entry for all motion: Lenis↔GSAP wiring, video scrub, pinned split, reveals, cursor, preloader gate, breakpoint re-boot. Returns a full teardown. |
| `src/videoMap.js` | Pure scroll→film-time math (piecewise anchors, monotonic sanitizing, buffer clamping). |
| `src/cart.js` | Pure immutable cart (add/remove/qty/count/total). |
| `src/App.jsx` | Sections + order drawer; stable callbacks; zero direct DOM/motion code. |
| `src/styles.css` | Brand tokens, layer architecture (header comment), premium panels, mobile fallback. |
| `nginx.conf` + `Dockerfile` | Production serving: `index.html no-cache`, hashed assets `immutable`, gzip, security headers. |
| `scripts/verify/` | CDP E2E harness: throttled-network load, scrub curve, reduced-motion mode, drawer flow. |

### The three runtime modes (`<html data-motion>`)

| Mode | Trigger | Behavior |
|---|---|---|
| `full` | desktop, no reduced-motion | Lenis smoothing, pinned split, reveals, cursor, scrubbed film |
| `reduced` | `prefers-reduced-motion: reduce` | **Film still scrubs** (it is user-driven content, not autoplay motion) — smoothing, pinning and decorative animation off |
| `mobile` | `(hover:none) and (pointer:coarse)` or ≤768px | **Film still scrubs** via a lighter 2.4 MB 640×640 "reels-framed" variant (full 16:9 film centered over a blurred self-extension, so portrait cover shows the whole burger) (`data-mobile-src`); native touch scroll, no pin/cursor, single-column layout. First touch runs a muted `play()→pause()` to unlock iOS frame rendering |

The `pointer:coarse` guard matters: VNC sessions and hybrid touchscreens report
`hover:none` on real desktops and must keep the full experience.

---

## Engineering principles → concrete decisions

| Principle | Where it lives |
|---|---|
| **Robust** | breakpoint re-boot (`motion.js initMotion`), `invalidateOnRefresh` on the pin, monotonic anchor sanitizing (`videoMap.sanitizeAnchors`), StrictMode-safe teardown |
| **Fast** | 4.1 MB 960×540 all-keyframe film (from 10.8 MB), gzip on text assets, immutable hashed bundles, no static `will-change`, grain without `mix-blend-mode`, `preload="none"` + gated load |
| **Resilient** | buffer-aware scrubbing (`clampToBuffered` + `contiguousBufferedEnd`) keeps responding on slow networks; preloader failsafe degrades to poster; media errors unveil the page |
| **Secure** | `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `server_tokens off`, no third-party scripts |
| **Idempotent** | pure cart updaters are safe under React double-invocation; `git push` + Dokploy `application.deploy` is repeatable; asset copies use `--update=none` |
| **Unambiguous (inequívoco)** | contracts proven by 23 unit tests; E2E numbers (film time per scroll point) asserted against the live site |
| **Persistent / permanent** | GitOps: the deployed artifact is the committed `dist/`; every deploy is a commit; caching designed so stale HTML can never outlive a deploy (`no-cache` + etag) |
| **Agnostic** | media generated through a provider-agnostic layer (Vertex/Flow/muapi/dola — see parent project `copy/asset-plan.md`); `base: './'` makes the build path-agnostic |
| **Professional / integral** | brand tokens as CSS variables, a11y (focus trap + restore, `aria-modal`, landmarks, `aria-pressed`), reduced-motion respected without breaking content |

---

## Why this stack

- **Vite + React (JS)** — instant dev loop; the site is one page, so no router/TS ceremony.
- **GSAP ScrollTrigger** — the only battle-tested pin+scrub engine; used idiomatically (one pin, scrubbed timeline, per-element reveals).
- **Lenis** — native-scroll smoothing that keeps accessibility (real scrollbar, keyboard) and integrates with GSAP via the documented ticker pattern.
- **All-keyframe H.264** — `-g 1` makes every frame an I-frame: `currentTime` seeks are exact and cheap, which is the entire trick behind smooth scroll-scrubbing.
- **nginx (own Dockerfile)** — Dokploy's generic static preset sends no `Cache-Control`; heuristic caching then serves stale HTML pointing at dead hashed bundles. Explicit headers fix that class of bug permanently.

## Develop / test / build

```bash
npm install
npm run dev            # local dev (Vite)
npm test               # vitest — 23 unit tests (videoMap + cart)
npm run build -- --base=./
```

### Replace the background film

```bash
# from the parent project root — re-encode any clip to scrub-ready form:
scripts/swap-bg-video.sh assets/videos/your-clip.mp4   # → website/public/bg.mp4 (all-keyframe)
```

Story beats re-anchor automatically: `motion.js buildVideoMap()` measures the
pin and CTA positions at runtime, so a different film only needs its three
timestamps adjusted in one place (the `raw.push` anchor list).

## Deploy (Dokploy, API-only)

1. `git push origin main`
2. `POST /api/application.deploy {applicationId}` — **not** `application.redeploy`,
   which rebuilds the previously-cloned code.
3. Poll `GET /api/deployment.all?applicationId=…` until a **new** deployment
   titled with your commit message reports `done` (the `applicationStatus`
   field alone lies between deploys: it still says `done` from the previous one).

DNS: Cloudflare A-record (DNS-only/grey) → Traefik terminates TLS with the
Let's Encrypt cert Dokploy provisioned for the domain.

## E2E verification (`scripts/verify/`)

Run against staging or production from any machine with a Chrome reachable
over CDP (default CDP `http://localhost:9267`, override with `CDP_URL`):

```bash
scripts/verify/verify_site.py https://burgerlab.facyt.net/     # throttled 4Mbps load,
                                                               # scrub curve, drawer flow
scripts/verify/verify_reduced.py https://burgerlab.facyt.net/  # prefers-reduced-motion mode
```

They assert the numbers that define the experience: preloader unveil time and
buffer growth under throttling, film time at five scroll positions (both
directions), the full drawer flow (add → totals → checkout → Escape), and that
reduced-motion still scrubs. Console one-liners for remote diagnosis:

```js
document.documentElement.dataset.motion   // 'full' | 'reduced' | 'mobile'
__bgv.readyState + ' / ' + __bgv.currentTime
```

## Deliberate tradeoffs / future enhancements

- **Film length**: the 8s clip compresses the "hold" stretches (ingredients/
  catalog advance few frames per viewport). A 12-16s regeneration fixes it
  (paid — cost-gated). A free alternative: subtle scroll parallax on card
  media — but note those elements use CSS `transform` transitions on hover,
  and GSAP inline transforms override CSS transitions; migrate the hovers to
  GSAP first if you attempt it.
- **`dist/` is committed** and the Dockerfile copies it (no CI build): fast,
  reproducible deploys at the cost of discipline — always rebuild before
  committing `src/` changes. A CI step (build + vitest on push) is the natural
  next hardening.
- **Single bundle** (no `manualChunks`): fine for a one-pager; split vendor
  chunks if this grows.

## Gotchas worth stealing

- `add_header` inside an nginx `location` **discards** all inherited headers — repeat security headers wherever you add `Cache-Control`.
- A `useEffect` whose deps include a callback prop re-runs on every parent render — keep dialog effects on `[open]` and read callbacks through a ref, or focus gets stolen on each interaction.
- `(hover: none)` alone is not "mobile". VNC and touch-capable desktops match it; require `(pointer: coarse)` too.
- Gating features behind `prefers-reduced-motion` must distinguish autoplay *motion* (drop it) from user-driven *content* (keep it) — or Linux/VNC users silently lose the product.
- Buffered ranges fragment: clamp seeks to the range **contiguous with 0**, not `buffered.end(length-1)`.

---

Fictional brand demo — no real orders, no real restaurant. © 2026 BurgerLab.
