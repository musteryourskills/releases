// Steps: greets the person by name when the invite links ?name=…, rises the
// intro in once, and walks the steps along: copying a step's command ticks its
// circle and marks the next step "Up next". Nothing is kept; a reload starts over.
;(() => {
  const NAME = 'steps'

  window.musterVariants[NAME] = {
    enter(root) {
      const steps = [...root.querySelectorAll('[data-step]')]
      const isShowing = () => document.documentElement.dataset.variant === NAME

      // "You’re in, Deep": from the invite link, as text only
      const name = (new URLSearchParams(location.search).get('name') || '').trim().slice(0, 40).trim()
      const greeting = root.querySelector('#steps-name')
      if (greeting) {
        greeting.querySelector('[data-steps-name]').textContent = name
        greeting.hidden = !name
      }

      // one entrance per visit: restart it each time the variant is shown
      root.classList.remove('st-entering')
      void root.offsetWidth
      root.classList.add('st-entering')

      // progress: the copied step is ticked; the next unticked one is up next
      const onCopied = (event) => {
        if (!isShowing()) return
        const step = event.detail?.button?.closest('[data-step]')
        if (!step || !root.contains(step)) return
        step.classList.add('is-done')
        const at = steps.indexOf(step)
        const open = (s) => !s.classList.contains('is-done')
        const next = steps.slice(at + 1).find(open) || steps.find(open)
        steps.forEach((s) => s.classList.toggle('is-current', s === next))
      }
      document.addEventListener('muster:copied', onCopied)

      return () => {
        document.removeEventListener('muster:copied', onCopied)
        root.classList.remove('st-entering')
        steps.forEach((s) => s.classList.remove('is-done', 'is-current'))
      }
    },
  }
})()
