// Poster: the headline's token, after the landing's (musteryourskills.com, assets/token.js).
// A pill in the sentence holds a die-cut sticker and a word. It plays once through what Muster
// finds ("98 skills" → "6 duplicates" → "2 conflicts" → back to "98 skills") and rests. It
// waits while the headline is hovered, focused, off screen or the tab is hidden; a click
// stops the autoplay and shows the next word. With reduced motion it never plays by itself,
// and a click swaps the word at once.
;(() => {
  'use strict'
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)')
  const phoneQuery = matchMedia('(max-width: 639px)') // the headline's tracking changes here

  /* ── springs (the landing's): Motion's {visualDuration, bounce} spring, sampled into a
     CSS linear() curve for WAAPI; a similar cubic-bezier where linear() is missing. */
  const HAS_LINEAR = CSS.supports('transition-timing-function', 'linear(0, 1)')
  const spring = (visualDuration, bounce = 0) => {
    const w = 2 * Math.PI / (visualDuration * 1.2), z = Math.max(.05, Math.min(1, 1 - bounce))
    const wd = w * Math.sqrt(Math.max(0, 1 - z * z))
    const x = (t) => z < 1
      ? 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t))
      : 1 - Math.exp(-w * t) * (1 + w * t)
    const envelope = (t) => z < 1 ? Math.exp(-z * w * t) * Math.hypot(1, z * w / wd) : Math.exp(-w * t) * (1 + w * t)
    let end = 0
    while (envelope(end) > .001) end += 1 / 120
    const duration = Math.round(end * 1000)
    if (!HAS_LINEAR) {
      const easing = bounce >= .4 ? 'cubic-bezier(.34, 1.45, .64, 1)' : bounce > 0 ? 'cubic-bezier(.3, 1.15, .5, 1)' : 'cubic-bezier(.22, 1, .36, 1)'
      return { duration, easing }
    }
    const n = Math.max(8, Math.round(end * 60)), pts = []
    for (let i = 0; i <= n; i++) pts.push(i === n ? 1 : +x(end * i / n).toFixed(4))
    return { duration, easing: `linear(${pts.join(', ')})` }
  }
  const SPRING_WIDTH = spring(.24, .2)   // the pill resizing
  const SPRING_SETTLE = spring(.18, .47) // the sticker settling after its pop
  const SPRING_EXIT = spring(.2, .2)     // the old sticker shrinking away
  const EASE_TEXT = 'cubic-bezier(.19, 1, .22, 1)'

  /* ── TextMorph (the landing's, after torph): letters both words share glide to their new
     spot, the rest fade and shrink out or fade and grow in. Pairing is an order-preserving
     match that prefers runs of adjacent letters, so shared letters never cross. */
  const pairLetters = (a, b) => {
    const n = a.length, m = b.length, NEG = -1e9
    const M = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(NEG))
    const D = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
    for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) M[i][j] = Math.max(D[i - 1][j - 1] + 10, M[i - 1][j - 1] + 13)
      D[i][j] = Math.max(D[i - 1][j], D[i][j - 1], M[i][j])
    }
    const pairs = new Map() // index in b → index in a
    let i = n, j = m, inRun = false
    while (i > 0 && j > 0) {
      const target = inRun ? M[i][j] : D[i][j]
      if (!inRun && target === D[i - 1][j]) { i--; continue }
      if (!inRun && target === D[i][j - 1]) { j--; continue }
      pairs.set(j - 1, i - 1)
      inRun = i > 1 && j > 1 && M[i][j] === M[i - 1][j - 1] + 13
      i--; j--
    }
    return pairs
  }

  function textMorph(el, { duration = 240, ease = EASE_TEXT } = {}) {
    let first = true, seq = 0, current = []
    const ids = (s) => {
      const chars = [...s], pairs = pairLetters(current.map((x) => x.c), chars)
      current = chars.map((c, k) => ({ c, id: pairs.has(k) ? current[pairs.get(k)].id : `m${seq++}` }))
      return current
    }
    const live = () => [...el.children].filter((n) => !n.dataset.exit)
    const shift = (n) => { const t = getComputedStyle(n).transform; return t && t !== 'none' ? new DOMMatrix(t) : { e: 0, f: 0 } }
    const pos = (visual = false) => {
      const r = el.getBoundingClientRect(), m = {}
      for (const n of live()) {
        const b = n.getBoundingClientRect(), t = visual ? { e: 0, f: 0 } : shift(n)
        m[n.dataset.id] = { x: b.left - r.left - t.e, y: b.top - r.top - t.f }
      }
      return m
    }
    const near = (i, list, keep, fwdFirst) => {
      const back = () => { for (let j = i - 1; j >= 0; j--) if (keep.has(list[j])) return list[j] }
      const fwd = () => { for (let j = i + 1; j < list.length; j++) if (keep.has(list[j])) return list[j] }
      return fwdFirst ? (fwd() ?? back()) : (back() ?? fwd())
    }
    return {
      set(text, instant = false) {
        if (first) el.textContent = ''
        const next = ids(text), nextIds = next.map((s) => s.id), nextSet = new Set(nextIds)
        const prev = pos(true)
        const oldNodes = live(), oldIds = oldNodes.map((n) => n.dataset.id)
        const kept = new Set(oldIds.filter((id) => nextSet.has(id)))

        // 1. freeze the leaving letters where they are drawn
        const exiting = oldNodes.filter((n) => !nextSet.has(n.dataset.id))
        for (const n of exiting) {
          const t = shift(n), op = getComputedStyle(n).opacity, l = n.offsetLeft + t.e, top = n.offsetTop + t.f
          n.getAnimations().forEach((a) => a.cancel())
          Object.assign(n.style, { position: 'absolute', left: `${l}px`, top: `${top}px`, opacity: op, pointerEvents: 'none' })
          n.dataset.exit = '1'
        }

        // 2. reuse kept letters by id, create the new ones
        const byId = new Map(oldNodes.filter((n) => kept.has(n.dataset.id)).map((n) => [n.dataset.id, n]))
        byId.forEach((n) => n.remove())
        const nodes = next.map(({ id, c }) => {
          let n = byId.get(id)
          if (!n) { n = document.createElement('span'); n.dataset.id = id }
          n.textContent = c
          el.append(n)
          return n
        })

        if (first || instant) {
          first = false
          exiting.forEach((n) => n.remove())
          nodes.forEach((n) => n.getAnimations().forEach((a) => a.cancel()))
          return
        }
        const curr = pos()

        // 3. kept letters slide from where they were; new ones ride with their nearest kept neighbour
        next.forEach(({ id }, i) => {
          const n = nodes[i], isNew = !kept.has(id), a = isNew ? near(i, nextIds, kept, false) : id
          const dx = a ? prev[a].x - curr[a].x : 0, dy = a ? prev[a].y - curr[a].y : 0
          n.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${isNew ? .95 : 1})` }, { transform: 'none' }],
            { duration, easing: ease, fill: 'backwards' })
          if (isNew) n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: duration * .5, delay: duration * .25, easing: 'linear', fill: 'backwards' })
        })

        // 4. leaving letters follow their nearest kept neighbour and fade fast
        for (const n of exiting) {
          const a = near(oldIds.indexOf(n.dataset.id), oldIds, kept, true)
          const dx = a ? curr[a].x - prev[a].x : 0, dy = a ? curr[a].y - prev[a].y : 0
          n.animate([{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) scale(.95)` }], { duration, easing: ease, fill: 'forwards' })
          n.animate([{ opacity: n.style.opacity || 1 }, { opacity: 0 }], { duration: duration * .25, easing: 'linear', fill: 'forwards' })
            .finished.then(() => n.remove(), () => n.remove())
        }
      },
    }
  }

  /* ── the words and their stickers (the landing's die-cut stickers: white-outlined flat
     shapes, tilted r°) */
  const STICKER = (inner) => `<svg viewBox="0 0 64 64">${inner}</svg>`
  const WORDS = [
    { label: '98 skills', r: -9, art: STICKER(`
      <g fill="#fff" stroke="#fff" stroke-width="7.5" stroke-linejoin="round"><rect x="5" y="16" width="26" height="32" rx="6" transform="rotate(-16 18 32)"/><rect x="24" y="5" width="26" height="32" rx="6" transform="rotate(12 37 21)"/><rect x="27" y="27" width="30" height="31" rx="6" transform="rotate(-5 42 42)"/></g>
      <rect x="5" y="16" width="26" height="32" rx="6" transform="rotate(-16 18 32)" fill="#EFEFED"/>
      <rect x="24" y="5" width="26" height="32" rx="6" transform="rotate(12 37 21)" fill="#DEDEDA"/>
      <rect x="27" y="27" width="30" height="31" rx="6" transform="rotate(-5 42 42)" fill="#202020"/>
      <rect x="33" y="35" width="14" height="5" rx="2.5" transform="rotate(-5 42 42)" fill="#F4F83B"/>
      <rect x="33" y="44" width="18" height="3" rx="1.5" transform="rotate(-5 42 42)" fill="#6C6C6C"/>`) },
    { label: '6 duplicates', r: 8, art: STICKER(`
      <g fill="#fff" stroke="#fff" stroke-width="7.5" stroke-linejoin="round"><rect x="7" y="6" width="32" height="40" rx="7"/><rect x="23" y="18" width="32" height="40" rx="7"/></g>
      <rect x="7" y="6" width="32" height="40" rx="7" fill="#EFEFED"/>
      <rect x="13" y="14" width="20" height="5" rx="2.5" fill="#BDBDB8"/><rect x="13" y="24" width="14" height="3" rx="1.5" fill="#BDBDB8"/>
      <rect x="23" y="18" width="32" height="40" rx="7" fill="#fff" stroke="#E4E4E0" stroke-width="1.5"/>
      <rect x="29" y="26" width="20" height="5" rx="2.5" fill="#FF9D2E"/><rect x="29" y="36" width="14" height="3" rx="1.5" fill="#BDBDB8"/><rect x="29" y="43" width="18" height="3" rx="1.5" fill="#BDBDB8"/>`) },
    { label: '2 conflicts', r: -8, art: STICKER(`
      <g fill="#fff" stroke="#fff" stroke-width="7.5" stroke-linejoin="round"><rect x="3" y="14" width="26" height="36" rx="6" transform="rotate(-10 16 32)"/><rect x="35" y="14" width="26" height="36" rx="6" transform="rotate(10 48 32)"/><circle cx="32" cy="31" r="10"/></g>
      <rect x="3" y="14" width="26" height="36" rx="6" transform="rotate(-10 16 32)" fill="#EFEFED"/>
      <rect x="35" y="14" width="26" height="36" rx="6" transform="rotate(10 48 32)" fill="#202020"/>
      <circle cx="32" cy="31" r="10" fill="#FF5263"/>
      <path d="M28 27l8 8M36 27l-8 8" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`) },
  ]
  const FIRST = 1800 // the first change, once the headline has been read
  const EVERY = 2200 // then each change
  const LIMIT = WORDS.length // one round, back to the first word, then it rests

  const layerHTML = ({ art, r }) =>
    `<span class="poster-token__layer" data-r="${r}" style="rotate:${r}deg"><span class="poster-token__art">${art}</span></span>`

  function enter(root) {
    const btn = root.querySelector('[data-poster-token]')
    const headline = btn && btn.closest('h1')
    if (!headline) return null
    const icon = btn.querySelector('.poster-token__icon')
    const morphEl = btn.querySelector('.poster-token__morph')
    const live = root.querySelector('[data-poster-live]')
    const morph = textMorph(morphEl)
    morph.set(WORDS[0].label)

    // every word laid out once (one inline-block per letter, as the morph draws them), to
    // measure its width in em: it follows the font size through every breakpoint
    const measure = document.createElement('span')
    measure.className = 'poster-token__measure'
    measure.setAttribute('aria-hidden', 'true')
    measure.innerHTML = WORDS.map(({ label }) => `<span>${[...label].map((c) => `<span>${c}</span>`).join('')}</span>`).join('')
    btn.append(measure)
    let at = 0, ems = []
    const measureAll = () => {
      const size = parseFloat(getComputedStyle(btn).fontSize)
      if (!size) return
      ems = [...measure.children].map((s) => Math.ceil(s.getBoundingClientRect().width / size * 100) / 100)
      if (ems[at]) btn.style.setProperty('--label-w', `${ems[at]}em`)
    }

    // the old sticker shrinks away from wherever it is; the new one pops (.4 → 1.2 → 1, with a
    // rotation overshoot) and settles on a spring
    const swapIcon = (word, instant) => {
      const holder = document.createElement('span')
      holder.innerHTML = layerHTML(word)
      const next = holder.firstElementChild
      if (instant) { icon.replaceChildren(next); return }
      icon.querySelectorAll('.poster-token__layer:not(.is-exiting)').forEach((old) => {
        const cs = getComputedStyle(old), rest = +old.dataset.r, side = Math.sign(rest) || 1
        const scale = cs.scale === 'none' ? '1' : cs.scale, rotate = cs.rotate === 'none' ? '0deg' : cs.rotate
        old.getAnimations().forEach((a) => a.cancel())
        old.classList.add('is-exiting')
        const out = [
          old.animate({ opacity: [cs.opacity, 0] }, { duration: 200, easing: 'ease-out', fill: 'forwards' }),
          old.animate({ scale: [scale, '.5'] }, { ...SPRING_EXIT, fill: 'forwards' }),
          old.animate({ rotate: [rotate, `${rest + 5 * side}deg`] }, { duration: 200, easing: 'ease-out', fill: 'forwards' }),
        ]
        Promise.all(out.map((a) => a.finished)).then(() => old.remove(), () => {})
      })
      icon.append(next)
      const side = Math.sign(word.r) || 1
      next.animate([
        { scale: '.4', rotate: `${word.r - 16 * side}deg`, easing: 'cubic-bezier(.16, .55, .3, 1)' },
        { scale: '1.2', rotate: `${word.r + 5 * side}deg`, offset: 2 / 3, easing: SPRING_SETTLE.easing },
        { scale: '1', rotate: `${word.r}deg` },
      ], { duration: 600 })
      next.animate({ opacity: [0, 1] }, { duration: 180, easing: 'ease-out' })
    }

    let widthAnim = null
    const show = (i, instant = motionQuery.matches) => {
      const word = WORDS[i]
      const from = btn.getBoundingClientRect().width
      widthAnim?.cancel()
      at = i
      if (ems[i]) btn.style.setProperty('--label-w', `${ems[i]}em`)
      if (!instant) {
        const to = btn.offsetWidth
        if (Math.abs(to - from) > .5) widthAnim = btn.animate({ width: [`${from}px`, `${to}px`] }, SPRING_WIDTH)
      }
      morph.set(word.label, instant)
      swapIcon(word, instant)
      // the heading reads "You’re in. 98 skills. Time to muster them." with whichever word shows
      btn.setAttribute('aria-label', word.label)
    }

    // autoplay: one timer, re-armed on every change of state
    let timer = 0, ticks = 0, started = false, stopped = false, ready = false
    let hovered = false, focused = false, onScreen = true
    const canPlay = () => ready && !motionQuery.matches && !stopped && !document.hidden && onScreen && !hovered && !focused
    const tick = () => {
      timer = 0
      if (!canPlay()) return
      started = true
      show((at + 1) % WORDS.length)
      if (++ticks >= LIMIT) stopped = true
      sync()
    }
    const sync = () => {
      if (!canPlay()) { clearTimeout(timer); timer = 0; return }
      if (!timer) timer = setTimeout(tick, started ? EVERY : FIRST)
    }

    const onClick = () => {
      stopped = true
      sync()
      show((at + 1) % WORDS.length)
      // a focused button's new name isn't reliably spoken, so say the word
      live.textContent = ''
      requestAnimationFrame(() => { live.textContent = WORDS[at].label })
    }
    const onEnter = () => { hovered = true; sync() }
    const onLeave = () => { hovered = false; sync() }
    const onFocusIn = () => { focused = true; sync() }
    const onFocusOut = () => { focused = false; sync() }
    btn.addEventListener('click', onClick)
    headline.addEventListener('pointerenter', onEnter)
    headline.addEventListener('pointerleave', onLeave)
    headline.addEventListener('focusin', onFocusIn)
    headline.addEventListener('focusout', onFocusOut)
    document.addEventListener('visibilitychange', sync)
    motionQuery.addEventListener('change', sync)
    phoneQuery.addEventListener('change', measureAll)
    document.fonts?.addEventListener?.('loadingdone', measureAll)
    const io = new IntersectionObserver((entries) => { onScreen = entries[entries.length - 1].isIntersecting; sync() })
    io.observe(headline)

    let alive = true
    measureAll()
    ;(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
      if (!alive) return
      measureAll()
      ready = true
      sync()
    })

    return () => {
      alive = false
      clearTimeout(timer)
      io.disconnect()
      btn.removeEventListener('click', onClick)
      headline.removeEventListener('pointerenter', onEnter)
      headline.removeEventListener('pointerleave', onLeave)
      headline.removeEventListener('focusin', onFocusIn)
      headline.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('visibilitychange', sync)
      motionQuery.removeEventListener('change', sync)
      phoneQuery.removeEventListener('change', measureAll)
      document.fonts?.removeEventListener?.('loadingdone', measureAll)
      widthAnim?.cancel()
      // rest on the first word, so the next visit starts where the HTML does
      at = 0
      measure.remove()
      morphEl.getAnimations({ subtree: true }).forEach((a) => a.cancel())
      morphEl.textContent = WORDS[0].label
      icon.replaceChildren()
      icon.innerHTML = layerHTML(WORDS[0])
      btn.setAttribute('aria-label', WORDS[0].label)
      if (ems[0]) btn.style.setProperty('--label-w', `${ems[0]}em`)
      live.textContent = ''
    }
  }

  window.musterVariants = window.musterVariants || {}
  window.musterVariants.poster = { enter }
})()
