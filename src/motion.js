import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { clampToBuffered, mapTime, sanitizeAnchors } from './videoMap.js'

gsap.registerPlugin(ScrollTrigger)

// pointer:coarse guards against desktops that report hover:none (VNC, hybrid
// touchscreens) — those must keep the full experience.
const MOBILE_MQ = '(hover: none) and (pointer: coarse), (max-width: 768px)'

// Re-runs the whole motion setup when the viewport crosses the mobile
// breakpoint (pin spacers, video scrub and cursor are mode-dependent).
export function initMotion() {
  const mq = window.matchMedia(MOBILE_MQ)
  let teardown = boot()
  const onModeChange = () => {
    teardown()
    teardown = boot()
    ScrollTrigger.refresh()
  }
  mq.addEventListener('change', onModeChange)
  return () => {
    mq.removeEventListener('change', onModeChange)
    teardown()
  }
}

function boot() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isMobile = window.matchMedia(MOBILE_MQ).matches
  const cleanups = []
  const triggers = [] // ScrollTriggers owned by this boot
  const tweens = [] // tweens/timelines owned by this boot

  // Diagnosable from any browser console: document.documentElement.dataset.motion
  document.documentElement.dataset.motion = reduced ? 'reduced' : isMobile ? 'mobile' : 'full'

  // ----- Lenis <-> GSAP wiring -----
  let lenis = null
  if (!reduced) {
    lenis = new Lenis({ duration: 1.12, smoothWheel: true, wheelMultiplier: 0.9 })
    lenis.on('scroll', ScrollTrigger.update)
    const raf = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    cleanups.push(() => {
      gsap.ticker.remove(raf)
      lenis.destroy()
    })
  }

  // ----- Order drawer <-> Lenis (App dispatches a CustomEvent) -----
  const onDrawerToggle = (e) => {
    if (!lenis) return
    if (e.detail?.open) lenis.stop()
    else lenis.start()
  }
  document.addEventListener('burgerlab:drawer', onDrawerToggle)
  cleanups.push(() => document.removeEventListener('burgerlab:drawer', onDrawerToggle))

  // ----- Smooth anchor navigation through Lenis -----
  const onAnchorClick = (e) => {
    const a = e.target.closest('a[href^="#"]')
    if (!a) return
    const target = document.querySelector(a.getAttribute('href'))
    if (!target) return
    e.preventDefault()
    if (lenis) lenis.scrollTo(target, { offset: 0 })
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
  }
  document.addEventListener('click', onAnchorClick)
  cleanups.push(() => document.removeEventListener('click', onAnchorClick))

  // ----- Nav state -----
  const nav = document.querySelector('.nav')
  if (nav) {
    triggers.push(
      ScrollTrigger.create({
        start: 60,
        end: 'max',
        onToggle: (self) => nav.classList.toggle('nav--scrolled', self.isActive),
      }),
    )
  }

  // ----- Global progress bar -----
  const bar = document.querySelector('#progress-bar')
  if (bar) {
    const t = gsap.to(bar, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 },
    })
    tweens.push(t)
    triggers.push(t.scrollTrigger)
  }

  // ----- Preloader + video load gate -----
  // Video ships with preload="none" so mobile never downloads it (it is
  // display:none there). Desktop starts the download here, behind the
  // preloader, and reveals the page when the clip can play through.
  const preloader = document.getElementById('preloader')
  const fill = document.getElementById('preloader-fill')
  const bgVideo = document.querySelector('#bgv')
  const hidePreloader = () => preloader && preloader.classList.add('preloader--done')
  if (preloader && !preloader.classList.contains('preloader--done')) {
    if (bgVideo && !isMobile) {
      bgVideo.preload = 'auto'
      const onProgress = () => {
        try {
          if (fill && bgVideo.buffered.length && bgVideo.duration) {
            const end = bgVideo.buffered.end(bgVideo.buffered.length - 1)
            fill.style.width = `${Math.min(100, (end / bgVideo.duration) * 100)}%`
          }
        } catch {
          /* buffered ranges can be briefly inconsistent during load */
        }
      }
      const onReady = () => hidePreloader()
      bgVideo.addEventListener('progress', onProgress)
      bgVideo.addEventListener('canplaythrough', onReady, { once: true })
      bgVideo.addEventListener('error', onReady, { once: true })
      // Failsafe: degrade to the poster if the network stalls without events.
      const failsafe = setTimeout(onReady, 8000) // # oneshot failsafe, not polling
      bgVideo.load()
      cleanups.push(() => {
        clearTimeout(failsafe)
        bgVideo.removeEventListener('progress', onProgress)
        bgVideo.removeEventListener('canplaythrough', onReady)
        bgVideo.removeEventListener('error', onReady)
      })
    } else {
      hidePreloader()
    }
  }

  // ----- Background video scrub -----
  // Piecewise scroll→time map so the story beats land on the right sections:
  // hero=assembled, split pin=full separation, ingredients/catalog=hold
  // exploded, experience→cta=reassembly. Pure math lives in videoMap.js.
  // The scrub is user-driven content (scroll = film position), not autoplay
  // motion — so it stays ON under prefers-reduced-motion; only smoothing,
  // pinning and decorative animations are dropped there.
  let lastVideoT = -1
  let videoMap = null
  if (bgVideo && !isMobile) {
    const buildVideoMap = () => {
      const dur = (bgVideo.duration || 8) - 0.05
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const pin = ScrollTrigger.getById('split-pin')
      const cta = document.querySelector('#cta')
      const raw = [[0, 0]]
      if (pin && cta && pin.end > pin.start) {
        const ctaEnter = cta.getBoundingClientRect().top + window.scrollY - window.innerHeight
        raw.push([pin.start, Math.min(1.1, dur)])
        raw.push([pin.end, Math.min(6.0, dur)])
        raw.push([ctaEnter, Math.min(6.6, dur)])
      }
      raw.push([maxScroll, dur])
      videoMap = sanitizeAnchors(raw)
    }
    const bufferedEnd = () => {
      try {
        const b = bgVideo.buffered
        return b.length ? b.end(b.length - 1) : 0
      } catch {
        return 0
      }
    }
    const updateVideo = () => {
      if (!bgVideo.duration) return
      if (!videoMap) buildVideoMap()
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      // Clamp to the buffered range so slow connections still scrub what they
      // have; the 'progress' listener below catches the frame up as more of
      // the clip arrives.
      const t = clampToBuffered(mapTime(videoMap, scrollTop), bufferedEnd())
      if (t === null) return
      // ~0.84 frame at 24fps: skips sub-frame seeks that repaint nothing.
      if (Math.abs(t - lastVideoT) > 0.035) {
        bgVideo.currentTime = t
        lastVideoT = t
      }
    }
    const remap = () => {
      buildVideoMap()
      updateVideo()
    }
    bgVideo.pause()
    bgVideo.currentTime = 0
    triggers.push(
      ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: updateVideo,
      }),
    )
    ScrollTrigger.addEventListener('refresh', remap)
    window.addEventListener('scroll', updateVideo, { passive: true })
    bgVideo.addEventListener('loadedmetadata', remap)
    bgVideo.addEventListener('progress', updateVideo)
    cleanups.push(() => {
      ScrollTrigger.removeEventListener('refresh', remap)
      window.removeEventListener('scroll', updateVideo)
      bgVideo.removeEventListener('loadedmetadata', remap)
      bgVideo.removeEventListener('progress', updateVideo)
    })
  }

  // ----- Pinned separation sequence (#split) -----
  const split = document.querySelector('#split')
  if (split && !isMobile && !reduced) {
    const words = split.querySelectorAll('.w')
    const labels = split.querySelectorAll('.ing-label')
    const counter = split.querySelector('#sep-counter')

    const tl = gsap.timeline({
      scrollTrigger: {
        id: 'split-pin',
        trigger: split,
        start: 'top top',
        end: () => '+=' + window.innerHeight * 2.6,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (counter) counter.textContent = String(Math.round(self.progress * 100)).padStart(3, '0') + '%'
        },
      },
    })

    tl.fromTo(
      words,
      { opacity: 0.12, y: 14, filter: 'blur(6px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', stagger: 0.06, duration: 0.5, ease: 'power2.out' },
      0,
    )
    tl.fromTo(
      labels,
      { opacity: 0, x: (i, el) => (el.classList.contains('ing-label--r') ? 26 : -26) },
      { opacity: 1, x: 0, stagger: 0.14, duration: 0.4, ease: 'power2.out' },
      0.25,
    )
    tl.to(words, { opacity: 0.25, duration: 0.3, ease: 'power1.in' }, 0.85)

    tweens.push(tl)
    triggers.push(tl.scrollTrigger)
  }

  // ----- Section reveals -----
  const revealEls = gsap.utils.toArray('[data-reveal]')
  if (reduced) {
    gsap.set(revealEls, { opacity: 1, y: 0 })
  } else {
    revealEls.forEach((el) => {
      const t = gsap.fromTo(
        el,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 84%', toggleActions: 'play none none reverse' },
        },
      )
      tweens.push(t)
      triggers.push(t.scrollTrigger)
    })
  }

  // ----- Custom cursor (desktop only) -----
  const cursor = document.querySelector('.custom-cursor')
  if (cursor && !isMobile && !reduced) {
    const xTo = gsap.quickTo(cursor, 'x', { duration: 0.18, ease: 'power2.out' })
    const yTo = gsap.quickTo(cursor, 'y', { duration: 0.18, ease: 'power2.out' })
    const move = (e) => {
      cursor.style.opacity = '1'
      xTo(e.clientX)
      yTo(e.clientY)
    }
    const over = (e) => {
      if (e.target.closest('a, button')) {
        cursor.style.width = '52px'
        cursor.style.height = '52px'
        cursor.style.borderColor = 'rgba(255,106,42,0.9)'
      }
    }
    const out = (e) => {
      if (e.target.closest('a, button')) {
        cursor.style.width = '34px'
        cursor.style.height = '34px'
        cursor.style.borderColor = 'rgba(245,179,26,0.65)'
      }
    }
    window.addEventListener('mousemove', move)
    document.addEventListener('mouseover', over)
    document.addEventListener('mouseout', out)
    cleanups.push(() => {
      window.removeEventListener('mousemove', move)
      document.removeEventListener('mouseover', over)
      document.removeEventListener('mouseout', out)
    })
  }

  // Webfonts shift layout after load — recompute trigger positions once.
  let cancelled = false
  const refresh = () => {
    if (!cancelled) ScrollTrigger.refresh()
  }
  if (document.fonts?.ready) document.fonts.ready.then(refresh)
  window.addEventListener('load', refresh)
  cleanups.push(() => {
    cancelled = true
    window.removeEventListener('load', refresh)
  })

  // ----- Debug hooks (kept in prod: harmless, enable remote diagnosis) -----
  window.__lenis = lenis
  window.__ST = ScrollTrigger
  window.__bgv = bgVideo

  return () => {
    cleanups.forEach((fn) => fn())
    triggers.forEach((t) => t && t.kill())
    tweens.forEach((t) => t && t.kill())
    gsap.ticker.lagSmoothing(500, 33) // restore GSAP default
  }
}
