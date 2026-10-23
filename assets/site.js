// muster.is — behaviour every variant shares: copying the install command,
// and the latest release's version and date from GitHub.

// Copy: any element with data-copy="…" copies that text when clicked. It
// gets data-copied while the confirmation shows, and the page announces it.
;(() => {
  const live = document.createElement('p')
  live.className = 'sr-only'
  live.setAttribute('role', 'status')
  document.body.append(live)

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // http://localhost or an older browser: fall back to a selection
      const area = Object.assign(document.createElement('textarea'), { value: text })
      area.setAttribute('readonly', '')
      area.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
      document.body.append(area)
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      return ok
    }
  }

  // The button's width follows its label ("Copy" → "Copied" and back): measure
  // it before and after the change, then glide between the two. Computed width
  // ignores the press's scale, and mid-glide it's the width on screen, so a
  // change that lands mid-glide carries on from there. The click answers fast
  // with a strong ease-out; the quiet return on its own is a softer ease-in-out.
  // Width, not a transform: the command beside the button has to make room.
  const reduce = matchMedia('(prefers-reduced-motion: reduce)')
  const CLICK = { duration: 240, easing: 'cubic-bezier(.23, 1, .32, 1)' }
  const SETTLE = { duration: 280, easing: 'cubic-bezier(.77, 0, .175, 1)' }
  const glides = new WeakMap()
  const widthOf = (el) => parseFloat(getComputedStyle(el).width)
  const resize = (button, change, timing) => {
    const from = widthOf(button)
    glides.get(button)?.cancel()
    change()
    const to = widthOf(button)
    if (reduce.matches || !(Math.abs(to - from) > 0.5)) return button.removeAttribute('data-morphing')
    button.setAttribute('data-morphing', '')
    const glide = button.animate({ width: [`${from}px`, `${to}px`] }, timing)
    glides.set(button, glide)
    glide.finished.then(() => button.removeAttribute('data-morphing'), () => {})
  }

  const timers = new WeakMap()
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy]')
    if (!button) return
    const ok = await copy(button.dataset.copy)
    if (!ok) return
    clearTimeout(timers.get(button))
    // a second click while it says Copied just keeps it there a little longer
    if (!button.hasAttribute('data-copied')) resize(button, () => button.setAttribute('data-copied', ''), CLICK)
    live.textContent = ''
    requestAnimationFrame(() => { live.textContent = 'Copied to the clipboard' })
    timers.set(button, setTimeout(() => resize(button, () => button.removeAttribute('data-copied'), SETTLE), 1800))
    document.dispatchEvent(new CustomEvent('muster:copied', { detail: { button, text: button.dataset.copy } }))
  })
})()

// Release: [data-release="version"] gets "0.45.0", [data-release="date"] gets
// "23 October 2026", [data-release="url"] gets the release's href. Elements
// keep their written fallback when GitHub can't be reached. The answer is
// kept for the session, so switching variants never asks twice.
window.musterRelease = (() => {
  const key = 'muster:release'
  const cached = sessionStorage.getItem(key)
  const request = cached
    ? Promise.resolve(JSON.parse(cached))
    : fetch('https://api.github.com/repos/musteryourskills/releases/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((r) => {
          const release = { version: r.tag_name.replace(/^v/, ''), date: r.published_at, url: r.html_url }
          sessionStorage.setItem(key, JSON.stringify(release))
          return release
        })
  const fill = (root = document) =>
    request
      .then((release) => {
        const date = new Date(release.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        root.querySelectorAll('[data-release="version"]').forEach((el) => { el.textContent = release.version })
        root.querySelectorAll('[data-release="date"]').forEach((el) => { el.textContent = date; el.setAttribute('datetime', release.date) })
        root.querySelectorAll('[data-release="url"]').forEach((el) => { el.href = release.url })
        root.querySelectorAll('[data-release-ready]').forEach((el) => el.setAttribute('data-release-ready', 'true'))
        return release
      })
      .catch(() => null)
  fill()
  return { request, fill }
})()
