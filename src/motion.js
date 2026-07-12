import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

export function initMotion() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isMobile = window.matchMedia('(hover: none), (max-width: 768px)').matches
  const cleanups = []

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

  // ----- Nav state -----
  const nav = document.querySelector('.nav')
  if (nav) {
    ScrollTrigger.create({
      start: 60,
      end: 'max',
      onToggle: (self) => nav.classList.toggle('nav--scrolled', self.isActive),
    })
  }

  // ----- Global progress bar -----
  const bar = document.querySelector('#progress-bar')
  if (bar) {
    gsap.to(bar, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 },
    })
  }

  // ----- Background video scrub -----
  // Piecewise scroll→time map so the story beats land on the right sections:
  // hero=assembled, split pin=full separation, ingredients/catalog=hold exploded,
  // experience→cta=reassembly. Falls back to linear if anchors are missing.
  const bgVideo = document.querySelector('#bgv')
  let lastVideoT = -1
  let videoMap = null
  if (bgVideo && !isMobile && !reduced) {
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
      videoMap = raw.filter((p, i, a) => i === 0 || p[0] > a[i - 1][0] + 1)
    }
    const mapTime = (y) => {
      const m = videoMap
      if (!m || m.length < 2) return 0
      if (y <= m[0][0]) return m[0][1]
      for (let i = 1; i < m.length; i++) {
        if (y <= m[i][0]) {
          const [y0, t0] = m[i - 1]
          const [y1, t1] = m[i]
          return t0 + ((y - y0) / Math.max(1, y1 - y0)) * (t1 - t0)
        }
      }
      return m[m.length - 1][1]
    }
    const updateVideo = () => {
      if (!bgVideo.duration) return
      if (!videoMap) buildVideoMap()
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const t = mapTime(scrollTop)
      if (Math.abs(t - lastVideoT) > 0.008) {
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
    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: updateVideo,
    })
    ScrollTrigger.addEventListener('refresh', remap)
    window.addEventListener('scroll', updateVideo, { passive: true })
    bgVideo.addEventListener('loadedmetadata', remap)
    cleanups.push(() => {
      ScrollTrigger.removeEventListener('refresh', remap)
      window.removeEventListener('scroll', updateVideo)
      bgVideo.removeEventListener('loadedmetadata', remap)
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
  }

  // ----- Section reveals -----
  const revealEls = gsap.utils.toArray('[data-reveal]')
  if (reduced) {
    gsap.set(revealEls, { opacity: 1, y: 0 })
  } else {
    revealEls.forEach((el) => {
      gsap.fromTo(
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

  // Webfonts shift layout after load — recompute trigger positions.
  const refresh = () => ScrollTrigger.refresh()
  if (document.fonts?.ready) document.fonts.ready.then(refresh)
  window.addEventListener('load', refresh)
  cleanups.push(() => window.removeEventListener('load', refresh))

  // ----- Dev hooks -----
  if (import.meta.env.DEV) {
    window.__lenis = lenis
    window.__ST = ScrollTrigger
    window.__bgv = bgVideo
  }

  return () => {
    cleanups.forEach((fn) => fn())
    ScrollTrigger.getAll().forEach((t) => t.kill())
    gsap.killTweensOf('*')
  }
}
