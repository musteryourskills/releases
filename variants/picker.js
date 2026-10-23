// The variant picker (harness only). ?variant=<name> is the source of truth.
// ← → step through the variants, 1–9 jump to one. Each variant may register
// window.musterVariants[name] = { enter(root) { …; return cleanup } }.
;(() => {
  const roots = [...document.querySelectorAll('[data-variant-root]')]
  const names = roots.map((root) => root.dataset.variantRoot)
  const labels = roots.map((root) => root.dataset.variantLabel)
  let cleanup = null

  const nav = document.createElement('nav')
  nav.className = 'variant-picker'
  nav.setAttribute('aria-label', 'Variants')
  names.forEach((name, i) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.variant = name
    button.textContent = labels[i]
    button.addEventListener('click', () => show(name, true))
    nav.append(button)
  })
  document.body.append(nav)

  function show(name, push) {
    if (!names.includes(name)) name = names[0]
    if (typeof cleanup === 'function') cleanup()
    cleanup = null
    document.documentElement.dataset.variant = name
    roots.forEach((root) => { root.hidden = root.dataset.variantRoot !== name })
    nav.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.variant === name)))
    if (push) {
      const url = new URL(location.href)
      url.searchParams.set('variant', name)
      history.replaceState(null, '', url)
      window.scrollTo(0, 0)
    }
    const root = roots[names.indexOf(name)]
    const variant = window.musterVariants?.[name]
    if (variant?.enter) cleanup = variant.enter(root) || null
  }

  document.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (event.target.closest('input, textarea, select, [contenteditable], [data-keys]')) return
    const at = names.indexOf(document.documentElement.dataset.variant)
    if (event.key === 'ArrowRight') show(names[(at + 1) % names.length], true)
    else if (event.key === 'ArrowLeft') show(names[(at - 1 + names.length) % names.length], true)
    else if (/^[1-9]$/.test(event.key) && names[+event.key - 1]) show(names[+event.key - 1], true)
  })

  show(new URLSearchParams(location.search).get('variant'), false)
})()
