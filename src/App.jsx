import { useCallback, useEffect, useRef, useState } from 'react'
import { addItem, cartCount, cartTotal, removeItem, setQty } from './cart.js'
import { burgers } from './data/burgers.js'
import { initMotion } from './motion.js'

const LAB_BURGER = { id: 'lab-burger', name: 'The Lab Burger', price: 14.9 }
const SIDES = [
  { id: 'lab-fries', name: 'Lab Fries', price: 3.5 },
  { id: 'amber-shake', name: 'Amber Shake', price: 4.9 },
]
const LAB_BUNDLE_PRICE = 19.9
const SAMPLE_ORDER = [
  { ...LAB_BURGER, qty: 1 },
  { ...SIDES[0], qty: 1 },
  { ...SIDES[1], qty: 1 },
]
const MENU_ITEMS = [
  { ...LAB_BURGER, desc: 'The flagship. Flame-grilled, molten cheddar, house sauce.' },
  ...burgers.map((b) => ({ id: b.id, name: b.name, price: parseFloat(b.price), desc: b.desc })),
  { ...SIDES[0], desc: 'Twice-cooked, amber-dusted.' },
  { ...SIDES[1], desc: 'Toasted caramel shake, lab thick.' },
]

// "Added ✓" feedback is timer-free: the .is-added CSS animation runs once and
// onAnimationEnd flips the state back (event-driven, no setTimeout).
function AddButton({ onAdd, label = 'Add to order', className = '' }) {
  const [added, setAdded] = useState(false)
  return (
    <button
      type="button"
      className={`btn btn--ghost btn--sm ${added ? 'is-added' : ''} ${className}`}
      onClick={() => {
        setAdded(true)
        onAdd()
      }}
      onAnimationEnd={() => setAdded(false)}
    >
      {added ? 'Added ✓' : label}
    </button>
  )
}

function FavButton({ name }) {
  const [fav, setFav] = useState(false)
  return (
    <button
      type="button"
      className={`fav-btn ${fav ? 'is-fav' : ''}`}
      aria-pressed={fav}
      aria-label={`${fav ? 'Remove' : 'Add'} ${name} ${fav ? 'from' : 'to'} favorites`}
      onClick={() => setFav(!fav)}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path
          d="M12 20.3 4.7 13a4.9 4.9 0 0 1 0-7 4.9 4.9 0 0 1 7 0l.3.3.3-.3a4.9 4.9 0 0 1 7 0 4.9 4.9 0 0 1 0 7Z"
          fill={fav ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    </button>
  )
}

function Nav({ count, onOpenOrder }) {
  return (
    <header className="nav">
      <a className="nav__logo" href="#home">
        Burger<span>Lab</span>
      </a>
      <nav className="nav__links" aria-label="Main navigation">
        <a href="#split">Sequence</a>
        <a href="#ingredients">Ingredients</a>
        <a href="#catalog">Menu</a>
        <a href="#experience">Experience</a>
      </nav>
      <button type="button" className="btn btn--primary btn--sm nav__order" onClick={onOpenOrder}>
        Order now
        {count > 0 && (
          <span className="nav__badge mono" aria-label={`${count} items in order`}>
            {count}
          </span>
        )}
      </button>
    </header>
  )
}

function Hero({ onOrderNow, onOpenMenu, onAddLabBurger }) {
  return (
    <section className="hero" id="home">
      <div className="hero__grid">
        <div className="hero__copy">
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
            <button type="button" className="btn btn--primary" onClick={onOrderNow}>
              Order The Lab Burger
            </button>
            <button type="button" className="btn btn--ghost" onClick={onOpenMenu}>
              View full menu
            </button>
          </div>
          <ul className="hero__chips" data-reveal>
            <li>Crafted fresh</li>
            <li>30 min delivery</li>
            <li>★ 4.9 rating</li>
          </ul>
        </div>
        <aside className="order-card floating-ui panel" data-reveal aria-label="Quick order">
          <div className="order-card__imgwrap">
            <img src="img/hero-burger.webp" alt="The Lab Burger" loading="eager" />
          </div>
          <div className="order-card__body">
            <div className="order-card__row">
              <h2 className="order-card__name">The Lab Burger</h2>
              <FavButton name="The Lab Burger" />
            </div>
            <p className="order-card__meta mono">
              <span className="order-card__price">${LAB_BURGER.price.toFixed(2)}</span>
              <span className="order-card__rating">★ 4.9</span>
              <span>25 min</span>
            </p>
            <AddButton onAdd={onAddLabBurger} />
          </div>
        </aside>
      </div>
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
        <h2 className="split__title impact__line" aria-label="We take it apart.">
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
        <figure className="ingredients__media panel" data-reveal>
          <img src="img/ingredients-detail.webp" alt="Macro detail of the Lab Burger cheese pull" loading="lazy" />
          <figcaption className="mono">fig. 01 — cheddar phase transition</figcaption>
        </figure>
        <ul className="ingredients__list">
          {INGREDIENT_SPECS.map((it, i) => (
            <li key={it.name} className="ingredients__item panel" data-reveal>
              <span className="ingredients__dot" aria-hidden="true"></span>
              <span className="ingredients__num mono">{String(i + 1).padStart(2, '0')}</span>
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

function Catalog({ onAdd }) {
  return (
    <section className="catalog section" id="catalog">
      <div className="section-head" data-reveal>
        <p className="eyebrow">The menu</p>
        <h2 className="section-title">Four experiments. Zero misses.</h2>
      </div>
      <div className="catalog__grid">
        {burgers.map((b) => (
          <article className="burger-card panel" key={b.id} data-reveal>
            <div className="burger-card__imgwrap">
              <img src={b.image} alt={`${b.name} burger`} loading="lazy" />
              <span className="burger-card__tag mono">{b.tag}</span>
              <FavButton name={b.name} />
            </div>
            <div className="burger-card__body">
              <h3 className="burger-card__name">{b.name}</h3>
              <p className="burger-card__desc">{b.desc}</p>
              <div className="burger-card__meta mono">
                <span className="burger-card__price">${b.price}</span>
                <span className="burger-card__rating">★ {b.rating}</span>
                <span className="burger-card__time">{b.time}</span>
              </div>
              <AddButton
                className="burger-card__add"
                onAdd={() => onAdd({ id: b.id, name: b.name, price: parseFloat(b.price) })}
              />
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

const CATEGORIES = ['Burgers', 'Sides', 'Shakes', 'Limited runs']

function Experience({ cart, onOpenOrder, onStartSample }) {
  const hasCart = cart.length > 0
  const showcase = hasCart ? cart : SAMPLE_ORDER
  const total = cartTotal(showcase)
  return (
    <section className="experience section" id="experience">
      <div className="section-head" data-reveal>
        <p className="eyebrow">The experience</p>
        <h2 className="section-title">From lab to door</h2>
      </div>
      <div className="experience__grid">
        <div className="experience__flow">
          <div className="experience__chips" data-reveal role="list" aria-label="Meal categories">
            {CATEGORIES.map((c, i) => (
              <span role="listitem" className={`chip mono ${i === 0 ? 'chip--active' : ''}`} key={c}>
                {c}
              </span>
            ))}
          </div>
          <p className="experience__line" data-reveal>
            Designed for late-night cravings and premium flavor.
          </p>
          {STEPS.map((s) => (
            <article className="step panel" key={s.n} data-reveal>
              <span className="step__num mono">{s.n}</span>
              <div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            </article>
          ))}
        </div>
        <aside className="summary-card floating-ui panel" data-reveal aria-label="Order summary">
          <header className="summary-card__head">
            <h3>{hasCart ? 'Your order' : 'Sample order'}</h3>
            <span className="mono summary-card__tag">{hasCart ? 'Lab #0042' : 'popular combo'}</span>
          </header>
          <ul className="summary-card__lines">
            {showcase.map((l) => (
              <li key={l.id}>
                <span>
                  {l.name} <span className="summary-card__qty mono">×{l.qty}</span>
                </span>
                <span className="mono">${(l.price * l.qty).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="summary-card__total">
            <span>Total</span>
            <span className="mono">${total.toFixed(2)}</span>
          </div>
          <button
            type="button"
            className="btn btn--primary summary-card__checkout"
            onClick={hasCart ? onOpenOrder : onStartSample}
          >
            {hasCart ? 'Review & checkout' : 'Start this order'}
          </button>
          <p className="summary-card__note mono">demo interface — fictional brand</p>
        </aside>
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

function CTA({ onOrderNow, onOpenMenu }) {
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
      <p className="cta__bundle mono" data-reveal>
        The Lab Bundle — burger + fries + shake · <strong>${LAB_BUNDLE_PRICE.toFixed(2)}</strong>
      </p>
      <div className="cta__actions" data-reveal>
        <button type="button" className="btn btn--primary btn--lg" onClick={onOrderNow}>
          Order The Lab Burger
        </button>
        <button type="button" className="btn btn--ghost btn--lg" onClick={onOpenMenu}>
          View full menu
        </button>
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

function Drawer({ open, tab, cart, onTab, onClose, onAdd, onSetQty, onRemove, onClear }) {
  const panelRef = useRef(null)
  // Ref keeps the open-effect's deps to [open] only: cart interactions
  // re-render App (new onClose identity) and must NOT re-run the effect —
  // that would steal focus and re-dispatch the lenis stop/start events.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const restoreFocusRef = useRef(null)
  const [placed, setPlaced] = useState(false)
  const count = cartCount(cart)
  const total = cartTotal(cart)

  useEffect(() => {
    if (!open) return undefined
    setPlaced(false)
    restoreFocusRef.current = document.activeElement
    document.body.classList.add('drawer-open')
    document.documentElement.classList.add('drawer-open')
    document.dispatchEvent(new CustomEvent('burgerlab:drawer', { detail: { open: true } }))
    panelRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      // Minimal focus trap: aria-modal promises the background is unreachable.
      const panel = panelRef.current
      if (!panel) return
      const focusables = panel.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('drawer-open')
      document.documentElement.classList.remove('drawer-open')
      document.dispatchEvent(new CustomEvent('burgerlab:drawer', { detail: { open: false } }))
      document.removeEventListener('keydown', onKey)
      restoreFocusRef.current?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="drawer-root">
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true"></div>
      <aside
        className="drawer panel"
        role="dialog"
        aria-modal="true"
        aria-label="BurgerLab order"
        tabIndex={-1}
        ref={panelRef}
      >
        <header className="drawer__head">
          {/* Plain toggle buttons: a full ARIA tabs pattern needs tabpanels +
              arrow-key roving focus; half-implementing it is worse for SRs. */}
          <div className="drawer__tabs" aria-label="Order sections">
            <button
              type="button"
              aria-pressed={tab === 'menu'}
              className={`drawer__tab mono ${tab === 'menu' ? 'is-active' : ''}`}
              onClick={() => onTab('menu')}
            >
              Menu
            </button>
            <button
              type="button"
              aria-pressed={tab === 'order'}
              className={`drawer__tab mono ${tab === 'order' ? 'is-active' : ''}`}
              onClick={() => onTab('order')}
            >
              Your order{count > 0 ? ` (${count})` : ''}
            </button>
          </div>
          <button type="button" className="drawer__close" onClick={onClose} aria-label="Close order panel">
            ✕
          </button>
        </header>

        {tab === 'menu' && (
          <ul className="drawer__menu">
            {MENU_ITEMS.map((m) => (
              <li key={m.id} className="drawer__menu-item">
                <div>
                  <h3>{m.name}</h3>
                  <p>{m.desc}</p>
                  <span className="mono drawer__price">${m.price.toFixed(2)}</span>
                </div>
                <AddButton label="Add" onAdd={() => onAdd(m)} />
              </li>
            ))}
          </ul>
        )}

        {tab === 'order' && !placed && (
          <div className="drawer__order">
            {cart.length === 0 ? (
              <p className="drawer__empty">
                Your order is empty. <br />
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => onTab('menu')}>
                  Browse the menu
                </button>
              </p>
            ) : (
              <>
                <ul className="drawer__lines">
                  {cart.map((l) => (
                    <li key={l.id}>
                      <div className="drawer__line-info">
                        <span>{l.name}</span>
                        <span className="mono drawer__price">${(l.price * l.qty).toFixed(2)}</span>
                      </div>
                      <div className="drawer__qty" aria-label={`Quantity of ${l.name}`}>
                        <button type="button" onClick={() => onSetQty(l.id, l.qty - 1)} aria-label="Decrease">
                          −
                        </button>
                        <span className="mono">{l.qty}</span>
                        <button type="button" onClick={() => onSetQty(l.id, l.qty + 1)} aria-label="Increase">
                          +
                        </button>
                        <button
                          type="button"
                          className="drawer__remove"
                          onClick={() => onRemove(l.id)}
                          aria-label={`Remove ${l.name}`}
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="drawer__total">
                  <span>Total</span>
                  <span className="mono">${total.toFixed(2)}</span>
                </div>
                <button
                  type="button"
                  className="btn btn--primary drawer__checkout"
                  onClick={() => {
                    setPlaced(true)
                    onClear()
                  }}
                >
                  Checkout — ${total.toFixed(2)}
                </button>
              </>
            )}
          </div>
        )}

        {tab === 'order' && placed && (
          <div className="drawer__placed">
            <span className="drawer__placed-icon" aria-hidden="true">
              ✓
            </span>
            <h3>Order placed</h3>
            <p>
              Lab #0042 is firing. Thirty minutes to your door. <br />
              <span className="mono drawer__note">demo — fictional brand, no real order</span>
            </p>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}

export default function App() {
  const [cart, setCart] = useState([])
  const [drawerTab, setDrawerTab] = useState(null) // null | 'menu' | 'order'

  useEffect(() => {
    const cleanup = initMotion()
    return cleanup
  }, [])

  // Stable identities: Drawer's open-effect and memo-friendly children must
  // not see a new callback on every cart re-render.
  const add = useCallback((item) => setCart((c) => addItem(c, item)), [])
  const openOrder = useCallback(() => setDrawerTab('order'), [])
  const openMenu = useCallback(() => setDrawerTab('menu'), [])
  const closeDrawer = useCallback(() => setDrawerTab(null), [])
  const clearCart = useCallback(() => setCart([]), [])
  const orderLabBurgerNow = useCallback(() => {
    setCart((c) => (c.some((l) => l.id === LAB_BURGER.id) ? c : addItem(c, LAB_BURGER)))
    setDrawerTab('order')
  }, [])
  const startSampleOrder = useCallback(() => {
    setCart((c) => (c.length ? c : SAMPLE_ORDER.map((l) => ({ ...l }))))
    setDrawerTab('order')
  }, [])

  return (
    <div className="page">
      <div className="progress" aria-hidden="true">
        <span id="progress-bar"></span>
      </div>
      <Nav count={cartCount(cart)} onOpenOrder={openOrder} />
      <main>
        <Hero onOrderNow={orderLabBurgerNow} onOpenMenu={openMenu} onAddLabBurger={() => add(LAB_BURGER)} />
        <Split />
        <Ingredients />
        <Catalog onAdd={add} />
        <Experience cart={cart} onOpenOrder={openOrder} onStartSample={startSampleOrder} />
        <CTA onOrderNow={orderLabBurgerNow} onOpenMenu={openMenu} />
      </main>
      <Footer />
      <Drawer
        open={drawerTab !== null}
        tab={drawerTab ?? 'order'}
        cart={cart}
        onTab={setDrawerTab}
        onClose={closeDrawer}
        onAdd={add}
        onSetQty={(id, q) => setCart((c) => setQty(c, id, q))}
        onRemove={(id) => setCart((c) => removeItem(c, id))}
        onClear={clearCart}
      />
      <div className="custom-cursor" aria-hidden="true"></div>
    </div>
  )
}
