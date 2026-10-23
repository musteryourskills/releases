// Note: greets the person by name when the invite links to ?name=Deep.
// The heading reads "You’re in." without a name and "Deep, you’re in." with one.
;(() => {
  const readName = () => {
    const raw = new URLSearchParams(location.search).get('name') || ''
    const clean = raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()
    return Array.from(clean).slice(0, 40).join('').trim()
  }

  window.musterVariants.note = {
    enter(root) {
      const title = root.querySelector('#note-title')
      const who = root.querySelector('[data-note-who]')
      const rest = root.querySelector('[data-note-rest]')
      if (!title || !who || !rest) return null

      const name = readName()
      if (name) {
        who.textContent = `${name}, `
        who.hidden = false
        rest.textContent = 'you’re in.'
        title.toggleAttribute('data-long', Array.from(name).length > 12)
      } else {
        who.textContent = ''
        who.hidden = true
        rest.textContent = 'You’re in.'
        title.removeAttribute('data-long')
      }
      return null
    },
  }
})()
