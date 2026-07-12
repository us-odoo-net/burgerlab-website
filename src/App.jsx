import { useEffect } from 'react'
import { burgers } from './data/burgers.js'
import { initMotion } from './motion.js'

function Nav() {
  return (
    <header className="nav" aria-label="Main navigation">
      <a className="nav__logo" href="#home">
        Burger<span>Lab</span>
      </a>
      <nav className="nav__links">
        <a href="#split">Sequence</a>
        <a href="#ingredients">Ingredients</a>
        <a href="#catalog">Menu</a>
        <a href="#experience">Experience</a>
      </nav>
      <a className="btn btn--primary btn--sm" href="#cta">
        Order now
      </a>
    </header>
  )
}

function Hero() {
  return (
    <section className="hero" id="home">
      <p className="eyebrow" data-reveal>
        BurgerLab · Dark kitchen series
      </p>
      <h1 className="hero__title" data-reveal>
        The Lab <em>Burger</em>
      </h1>
      <p className="hero__sub" data-reveal>
        One flagship burger, engineered layer by layer. Scroll — and watch it come apart.
      </p>
      <div className="hero__actions" data-reveal>
        <a className="btn btn--primary" href="#cta">
          Order The Lab Burger
        </a>
        <a className="btn btn--ghost" href="#catalog">
          View full menu
        </a>
      </div>
      <ul className="hero__chips" data-reveal>
        <li>Crafted fresh</li>
        <li>30 min delivery</li>
        <li>★ 4.9 rating</li>
      </ul>
      <div className="hero__scrollhint" aria-hidden="true">
        <span className="hero__scrollhint-line"></span>
        scroll to deconstruct
      </div>
    </section>
  )
}

const INGREDIENT_LABELS = [
  { text: 'Top brioche bun', side: 'l', top: '16%' },
  { text: 'Melted cheddar', side: 'r', top: '28%' },
  { text: 'Flame-grilled patty', side: 'l', top: '42%' },
  { text: 'Tomato & greens', side: 'r', top: '56%' },
  { text: 'House sauce', side: 'l', top: '68%' },
  { text: 'Brioche base', side: 'r', top: '78%' },
]

function Split() {
  return (
    <section className="split" id="split" aria-label="Scroll-controlled burger separation">
      <div className="split__inner">
        <h2 className="split__title" aria-label="We take it apart.">
          <span className="w">We</span> <span className="w">take</span> <span className="w">it</span>{' '}
          <span className="w">apart.</span>
        </h2>
        <p className="split__sub">
          <span className="w">Every</span> <span className="w">layer,</span> <span className="w">separated</span>{' '}
          <span className="w">by</span> <span className="w">your</span> <span className="w">scroll.</span>
        </p>
        {INGREDIENT_LABELS.map((l, i) => (
          <div
            key={l.text}
            className={`ing-label ing-label--${l.side}`}
            style={{ top: l.top }}
            data-ing-index={i}
          >
            <span className="ing-label__num">{String(i + 1).padStart(2, '0')}</span>
            <span className="ing-label__text">{l.text}</span>
            <span className="ing-label__line" aria-hidden="true"></span>
          </div>
        ))}
        <div className="split__counter" aria-hidden="true">
          separation <span id="sep-counter">000%</span>
        </div>
      </div>
    </section>
  )
}

const INGREDIENT_SPECS = [
  { name: 'Toasted brioche', spec: 'Buttered, seared 40s to a gold crust.' },
  { name: 'Flame-grilled patty', spec: 'Dry-aged beef blend, charred over open fire.' },
  { name: 'Melted cheddar', spec: '18-month aged, melted at exactly 72°C.' },
  { name: 'Fresh greens', spec: 'Crisp lettuce, ripe tomato, house pickles.' },
  { name: 'Signature sauce', spec: '11 ingredients. Formula classified.' },
]

function Ingredients() {
  return (
    <section className="ingredients section" id="ingredients">
      <div className="section-head" data-reveal>
        <p className="eyebrow">Inside the stack</p>
        <h2 className="section-title">Built from first principles</h2>
      </div>
      <div className="ingredients__grid">
        <figure className="ingredients__media" data-reveal>
          <img src="img/ingredients-detail.webp" alt="Macro detail of the Lab Burger cheese pull" loading="lazy" />
          <figcaption className="mono">fig. 01 — cheddar phase transition</figcaption>
        </figure>
        <ul className="ingredients__list">
          {INGREDIENT_SPECS.map((it, i) => (
            <li key={it.name} className="ingredients__item" data-reveal>
              <span className="ingredients__num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{it.name}</h3>
                <p>{it.spec}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Catalog() {
  return (
    <section className="catalog section" id="catalog">
      <div className="section-head" data-reveal>
        <p className="eyebrow">The menu</p>
        <h2 className="section-title">Four experiments. Zero misses.</h2>
      </div>
      <div className="catalog__grid">
        {burgers.map((b) => (
          <article className="burger-card" key={b.id} data-reveal>
            <div className="burger-card__imgwrap">
              <img src={b.image} alt={`${b.name} burger`} loading="lazy" />
              <span className="burger-card__tag mono">{b.tag}</span>
            </div>
            <div className="burger-card__body">
              <h3 className="burger-card__name">{b.name}</h3>
              <p className="burger-card__desc">{b.desc}</p>
              <div className="burger-card__meta mono">
                <span className="burger-card__price">${b.price}</span>
                <span className="burger-card__rating">★ {b.rating}</span>
                <span className="burger-card__time">{b.time}</span>
              </div>
              <button className="btn btn--ghost btn--sm burger-card__add" type="button">
                Add to order
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

const STEPS = [
  { n: '01', t: 'Order in seconds', d: 'Pick your build, pay, done. No apps required.' },
  { n: '02', t: 'The lab fires', d: 'Patties hit open flame the moment you confirm.' },
  { n: '03', t: 'At your door', d: 'Sealed hot, delivered in thirty minutes or less.' },
]

function Experience() {
  return (
    <section className="experience section" id="experience">
      <div className="section-head" data-reveal>
        <p className="eyebrow">The experience</p>
        <h2 className="section-title">From lab to door</h2>
      </div>
      <div className="experience__steps">
        {STEPS.map((s) => (
          <article className="step" key={s.n} data-reveal>
            <span className="step__num mono">{s.n}</span>
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </article>
        ))}
      </div>
      <div className="experience__stats" data-reveal>
        <div className="stat">
          <span className="spec__value mono">30&thinsp;min</span>
          <span className="stat__label">average delivery</span>
        </div>
        <div className="stat">
          <span className="spec__value mono">4.9</span>
          <span className="stat__label">average rating</span>
        </div>
        <div className="stat">
          <span className="spec__value mono">12k+</span>
          <span className="stat__label">lab orders served</span>
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="cta section" id="cta">
      <p className="eyebrow" data-reveal>
        Hungry for science?
      </p>
      <h2 className="cta__title" data-reveal>
        Order The Lab Burger
      </h2>
      <p className="cta__sub" data-reveal>
        Reassembled to perfection. Delivered while the cheddar is still molten.
      </p>
      <div className="cta__actions" data-reveal>
        <a className="btn btn--primary btn--lg" href="#home">
          Order now
        </a>
        <a className="btn btn--ghost btn--lg" href="#catalog">
          View full menu
        </a>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <span className="footer__brand">
          Burger<span>Lab</span>
        </span>
        <nav className="footer__links" aria-label="Footer">
          <a href="#home">Top</a>
          <a href="#catalog">Menu</a>
          <a href="#experience">Experience</a>
        </nav>
        <p className="footer__note mono">
          Fictional brand — all food imagery &amp; film AI-generated. © 2026 BurgerLab.
        </p>
      </div>
    </footer>
  )
}

export default function App() {
  useEffect(() => {
    const cleanup = initMotion()
    return cleanup
  }, [])

  return (
    <div className="page">
      <div className="progress" aria-hidden="true">
        <span id="progress-bar"></span>
      </div>
      <Nav />
      <main>
        <Hero />
        <Split />
        <Ingredients />
        <Catalog />
        <Experience />
        <CTA />
      </main>
      <Footer />
      <div className="custom-cursor" aria-hidden="true"></div>
    </div>
  )
}
