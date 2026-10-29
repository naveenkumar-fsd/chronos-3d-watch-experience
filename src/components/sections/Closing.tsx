import { useCallback, useRef, useState } from 'react'
import { goTo } from '../../lib/scroll'
import { RegisterModal } from './RegisterModal'

export function Closing({ reduced }: { reduced: boolean }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    // Hand focus back to the button that opened the dialog.
    window.setTimeout(() => triggerRef.current?.focus({ preventScroll: true }), 0)
  }, [])

  return (
    <>
      <section id="contact" className="closing">
        <div className="closing__top">
          <span className="mono eyebrow">Fig. 05 &mdash; Reassembled</span>
          <h2 className="display">Time, <em>assembled.</em></h2>
          <p>Back together, and ready to be worn. Register your interest and we will write when the atelier opens.</p>
          <button type="button" className="cta" ref={triggerRef} onClick={() => setOpen(true)} aria-haspopup="dialog">
            <span>Register your interest</span>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14m0 0-6-6m6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
          </button>
        </div>
        <div className="closing__word display" aria-hidden="true">CHRONOS</div>
      </section>

      {open && <RegisterModal onClose={close} />}

      <footer className="footer">
        <div>
          <span className="footer__brand">CHRONOS</span>
          <p className="mono">A concept site. No product is for sale.</p>
        </div>
        <nav aria-label="Footer" className="footer__nav mono">
          {[['#reveal', 'Reveal'], ['#anatomy', 'Anatomy'], ['#explorer', 'Explorer'], ['#specimen', 'Specimen']].map(([h, l]) => (
            <a
              key={h}
              href={h}
              onClick={(e) => {
                e.preventDefault()
                goTo(h!, reduced)
              }}
            >
              {l}
            </a>
          ))}
        </nav>
        {/* <p className="mono footer__credit">React &middot; Three.js &middot; GSAP</p> */}
      </footer>
    </>
  )
}
