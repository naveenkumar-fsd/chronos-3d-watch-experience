export function goTo(hash: string, reduced: boolean) {
  const el = document.querySelector(hash)
  if (el) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
}
