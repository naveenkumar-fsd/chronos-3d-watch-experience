import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import './RegisterModal.css'

/** Edit this list to match the watches you want people to choose from. */
const MODELS = ['Dive watch (as shown on this page)', 'Not sure yet']

interface Values {
  name: string
  email: string
  phone: string
  model: string
  message: string
}
type Errors = Partial<Record<'name' | 'email' | 'phone', string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validate(v: Values): Errors {
  const errors: Errors = {}
  if (!v.name.trim()) errors.name = 'Please enter your full name.'
  const email = v.email.trim()
  if (!email) errors.email = 'Please enter your email address.'
  else if (!EMAIL_RE.test(email)) errors.email = 'This email address does not look right.'
  const phone = v.phone.trim()
  if (phone && (!/^[+()\d\s.-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7)) {
    errors.phone = 'Use digits, spaces, + ( ) or - only (at least 7 digits).'
  }
  return errors
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function RegisterModal({ onClose }: { onClose: () => void }) {
  const uid = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [values, setValues] = useState<Values>({ name: '', email: '', phone: '', model: MODELS[0] ?? '', message: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [doneName, setDoneName] = useState<string | null>(null)

  // Escape to close, Tab kept inside the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!nodes || nodes.length === 0) return
      const first = nodes[0]!
      const last = nodes[nodes.length - 1]!
      const current = document.activeElement
      if (e.shiftKey && (current === first || !dialogRef.current?.contains(current))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (current === last || !dialogRef.current?.contains(current))) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Lock page scroll while open, without letting the layout jump when the scrollbar disappears.
  useEffect(() => {
    const html = document.documentElement
    const prev = { overflow: html.style.overflow, paddingRight: html.style.paddingRight }
    const scrollbar = window.innerWidth - html.clientWidth
    html.style.overflow = 'hidden'
    if (scrollbar > 0) html.style.paddingRight = `${scrollbar}px`
    nameRef.current?.focus({ preventScroll: true })
    return () => {
      html.style.overflow = prev.overflow
      html.style.paddingRight = prev.paddingRight
    }
  }, [])

  const set = (key: keyof Values) => (e: { target: { value: string } }) => {
    const value = e.target.value
    setValues((v) => ({ ...v, [key]: value }))
    if (key === 'name' || key === 'email' || key === 'phone') {
      setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    const firstBad = (['name', 'email', 'phone'] as const).find((k) => found[k])
    if (firstBad) {
      dialogRef.current?.querySelector<HTMLElement>(`[name="${firstBad}"]`)?.focus()
      return
    }
    // Frontend only: nothing is sent anywhere yet.
    setDoneName(values.name.trim())
  }

  const id = (s: string) => `${uid}-${s}`

  return createPortal(
    <div
      className="rm"
      // Keep presses on the dialog away from the page's watch drag handler.
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="rm__panel" role="dialog" aria-modal="true" aria-labelledby={id('title')} ref={dialogRef}>
        <i className="rm__tick rm__tick--tl" aria-hidden="true" />
        <i className="rm__tick rm__tick--br" aria-hidden="true" />

        <button type="button" className="rm__close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
        </button>

        {doneName === null ? (
          <form onSubmit={onSubmit} noValidate>
            <header className="rm__head">
              <span className="mono eyebrow">Fig. 06 &mdash; Register</span>
              <h2 className="display" id={id('title')}>Register your <em>interest.</em></h2>
              <p>Leave your details and tell us which watch you have in mind.</p>
            </header>

            <div className="rm__grid">
              <div className="rm__field rm__field--wide">
                <label htmlFor={id('name')} className="mono">Full name <b aria-hidden="true">*</b></label>
                <input
                  ref={nameRef}
                  id={id('name')}
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={values.name}
                  onChange={set('name')}
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? id('name-err') : undefined}
                />
                {errors.name && <span className="rm__err mono" id={id('name-err')} role="alert">{errors.name}</span>}
              </div>

              <div className="rm__field">
                <label htmlFor={id('email')} className="mono">Email address <b aria-hidden="true">*</b></label>
                <input
                  id={id('email')}
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={values.email}
                  onChange={set('email')}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? id('email-err') : undefined}
                />
                {errors.email && <span className="rm__err mono" id={id('email-err')} role="alert">{errors.email}</span>}
              </div>

              <div className="rm__field">
                <label htmlFor={id('phone')} className="mono">Phone <span>(optional)</span></label>
                <input
                  id={id('phone')}
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={values.phone}
                  onChange={set('phone')}
                  aria-invalid={errors.phone ? true : undefined}
                  aria-describedby={errors.phone ? id('phone-err') : undefined}
                />
                {errors.phone && <span className="rm__err mono" id={id('phone-err')} role="alert">{errors.phone}</span>}
              </div>

              <div className="rm__field rm__field--wide">
                <label htmlFor={id('model')} className="mono">Watch model</label>
                <select id={id('model')} name="model" value={values.model} onChange={set('model')}>
                  {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="rm__field rm__field--wide">
                <label htmlFor={id('message')} className="mono">Message <span>(optional)</span></label>
                <textarea id={id('message')} name="message" rows={3} maxLength={600} value={values.message} onChange={set('message')} />
              </div>
            </div>

            <div className="rm__actions">
              <button type="submit" className="cta">
                <span>Register</span>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14m0 0-6-6m6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
              </button>
              <p className="mono">Concept site: this form is not connected to a server yet.</p>
            </div>
          </form>
        ) : (
          <div className="rm__done" role="status">
            <header className="rm__head">
              <span className="mono eyebrow">Registration complete</span>
              <h2 className="display" id={id('title')}>Thank you, <em>{doneName}.</em></h2>
              <p>
                Your form was filled in correctly. This is a concept site with no server connected yet,
                so your details have not been sent or stored anywhere.
              </p>
            </header>
            <div className="rm__actions">
              <button type="button" className="cta" onClick={onClose}><span>Close</span></button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
