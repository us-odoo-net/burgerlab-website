# BurgerLab — scroll-driven cinematic landing

Fictional dark-luxury burger brand. The scroll scrubs an AI-generated product film (Veo 3.1) frame-by-frame while The Lab Burger separates into ingredients and reassembles toward the CTA.

- Stack: Vite + React + GSAP ScrollTrigger + Lenis
- `dist/` is committed (built on VPS2) and served by Dokploy `static` build type (`publishDirectory: dist`)
- All food imagery & film AI-generated. Prompts and asset provenance live in the parent project (`copy/`).

## Rebuild

```bash
npm install && npm run build -- --base=./
```
