// Terminal: the window replays the real installer once, as fast as a real one.
// The command is already pasted; Return "happens", the download spins for a
// beat, then the welcome lands in two. Without JS, or with reduced motion,
// the window simply shows the finished output. Replay runs it again.
;(() => {
  const FRAMES = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
  const RETURN = 640 // the pasted command sits for a moment, then Return
  const SPIN_FROM = 720 // the download line arrives (its data-at)
  const SPIN_TO = 1960 // …and finishes: the spinner becomes a check
  const DONE = 2600 // after the last beat (data-at 2560)

  window.musterVariants = window.musterVariants || {}
  window.musterVariants.terminal = {
    enter(root) {
      // ?name=Deep greets them: "You're in, Deep."
      const nameEl = root.querySelector('[data-tm-name]')
      const raw = new URLSearchParams(location.search).get('name') || ''
      const name = raw.trim().replace(/\s+/g, ' ').slice(0, 40).trim()
      if (nameEl) nameEl.textContent = name ? `, ${name}` : ''

      const shell = root.querySelector('[data-tm-shell]')
      if (!shell) return
      const lines = [...shell.querySelectorAll('[data-at]')]
      const download = shell.querySelector('.tm-dl')
      const spinner = shell.querySelector('[data-tm-spinner]')
      const replay = root.querySelector('[data-tm-replay]')
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

      let timers = []
      let spin = 0
      let io = null
      const at = (ms, fn) => timers.push(setTimeout(fn, ms))
      const stop = () => {
        timers.forEach(clearTimeout)
        timers = []
        clearInterval(spin)
        spin = 0
      }

      // the finished output: exactly what shows without JS
      const settle = () => {
        stop()
        shell.classList.remove('is-armed', 'is-waiting')
        shell.removeAttribute('aria-busy')
        lines.forEach((line) => line.classList.remove('is-in'))
        download.classList.remove('is-done')
        replay.dataset.state = 'ready'
        replay.removeAttribute('aria-disabled')
      }

      // the first frame: the command pasted, the cursor waiting after it
      const prime = () => {
        stop()
        lines.forEach((line) => line.classList.remove('is-in'))
        download.classList.remove('is-done')
        spinner.textContent = FRAMES[0]
        shell.classList.add('is-armed', 'is-waiting')
        shell.setAttribute('aria-busy', 'true')
      }

      const run = () => {
        prime()
        at(RETURN, () => shell.classList.remove('is-waiting'))
        lines.forEach((line) => at(+line.dataset.at, () => line.classList.add('is-in')))
        at(SPIN_FROM, () => {
          let f = 0
          spin = setInterval(() => { spinner.textContent = FRAMES[(f = (f + 1) % FRAMES.length)] }, 80)
        })
        at(SPIN_TO, () => {
          clearInterval(spin)
          download.classList.add('is-done')
        })
        at(DONE, settle)
      }

      const onReplay = () => {
        if (replay.getAttribute('aria-disabled') === 'true') return
        replay.setAttribute('aria-disabled', 'true')
        run()
      }

      replay.hidden = false
      replay.addEventListener('click', onReplay)

      if (reduced) {
        settle()
      } else {
        // play once the window is in view; until then it waits on its first frame
        replay.dataset.state = 'hidden'
        prime()
        io = new IntersectionObserver((entries) => {
          if (!entries.some((e) => e.isIntersecting)) return
          io.disconnect()
          io = null
          run()
        }, { threshold: 0.25 })
        io.observe(shell)
      }

      return () => {
        if (io) io.disconnect()
        io = null
        settle()
        replay.removeEventListener('click', onReplay)
        replay.dataset.state = 'hidden'
        replay.hidden = true
      }
    },
  }
})()
