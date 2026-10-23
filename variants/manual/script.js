// Manual: the greeting from ?name=, and the contents rail whose ink mark
// follows the section you're reading.
;(() => {
  const NAME = 'manual'
  const showing = () => document.documentElement.dataset.variant === NAME

  window.musterVariants = window.musterVariants || {}
  window.musterVariants[NAME] = {
    enter(root) {
      // "Welcome to Muster, Deep." when the invite links to ?name=Deep
      const slot = root.querySelector('[data-manual-name]')
      const name = (new URLSearchParams(location.search).get('name') || '').trim().slice(0, 40).trim()
      if (slot) slot.textContent = name ? `, ${name}` : ''

      const toc = root.querySelector('.mn-toc')
      const mark = toc && toc.querySelector('.mn-toc__mark')
      if (!toc || !mark || !('IntersectionObserver' in window)) return

      const links = [...toc.querySelectorAll('a[href^="#manual-"]')]
      const sections = links.map((a) => root.querySelector(a.getAttribute('href')))
      if (sections.some((s) => !s)) return

      let alive = true
      let current = -1
      let lock = -1 // a clicked item holds until the scroll it started settles
      let settle = 0
      let frame = 0
      let glide = 0
      const visible = new Set()

      const place = () => {
        const a = links[current]
        if (!a || !a.offsetHeight) return // the rail is hidden below 880px
        mark.style.setProperty('--mn-y', `${a.offsetTop + (a.offsetHeight - mark.offsetHeight) / 2}px`)
        if (!toc.dataset.ready) {
          // first placement lands without travelling; glide from then on
          toc.dataset.ready = 'true'
          glide = requestAnimationFrame(() => { glide = requestAnimationFrame(() => { if (alive) toc.dataset.ready = 'glide' }) })
        }
      }

      const activate = (i) => {
        if (i === current || i < 0) return
        current = i
        links.forEach((a, j) => (j === i ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current')))
        place()
      }

      // the section whose top has crossed into the top 40% of the window; the last one at the very bottom
      const pick = () => {
        if (!alive || !showing() || lock >= 0) return
        const doc = document.documentElement
        if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) return activate(sections.length - 1)
        let at = -1
        sections.forEach((s, i) => { if (visible.has(s)) at = i })
        if (at >= 0) activate(at)
      }

      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)))
        pick()
      }, { rootMargin: '0px 0px -60% 0px' })
      sections.forEach((s) => io.observe(s))

      const onScroll = () => {
        if (!showing()) return
        if (lock >= 0) {
          clearTimeout(settle)
          settle = setTimeout(() => { lock = -1 }, 160)
          return
        }
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(pick)
      }
      const onClick = (event) => {
        const i = links.indexOf(event.target.closest('a'))
        if (i < 0) return
        lock = i
        clearTimeout(settle)
        settle = setTimeout(() => { lock = -1 }, 900) // in case nothing scrolls (already there)
        current = -1
        activate(i)
      }
      const onResize = () => { if (showing()) place() }

      toc.addEventListener('click', onClick)
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onResize)
      document.fonts?.ready.then(() => { if (alive) place() })
      activate(0)

      return () => {
        alive = false
        io.disconnect()
        toc.removeEventListener('click', onClick)
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onResize)
        cancelAnimationFrame(frame)
        cancelAnimationFrame(glide)
        clearTimeout(settle)
        delete toc.dataset.ready
        links.forEach((a) => a.removeAttribute('aria-current'))
      }
    },
  }
})()
