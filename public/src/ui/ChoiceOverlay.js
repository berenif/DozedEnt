// ChoiceOverlay.js
// Minimal overlay to list 3 choices and commit selection

export class ChoiceOverlay {
  constructor({ modalId, wasmApi }) {
    this.el = document.getElementById(modalId)
    this.api = wasmApi
  }

  show() {
    if (!this.el) return
    this.el.classList.add('active')
    this.render()
  }

  hide() {
    if (!this.el) return
    this.el.classList.remove('active')
  }

  render() {
    const ex = this.api.exports || {}
    const count = typeof ex.get_choice_count === 'function' ? Math.max(0, ex.get_choice_count() | 0) : 0
    const items = []
    for (let i = 0; i < count; i += 1) {
      const id = typeof ex.get_choice_id === 'function' ? ex.get_choice_id(i) : i
      const type = typeof ex.get_choice_type === 'function' ? ex.get_choice_type(i) : 0
      const rarity = typeof ex.get_choice_rarity === 'function' ? ex.get_choice_rarity(i) : 0
      items.push({ id, type, rarity })
    }
    const html = [
      '<h3>Choose Your Reward</h3>',
      '<div class="choices">',
      ...items.slice(0, 3).map(item => (
        `<div class="card" data-id="${String(item.id)}">` +
        `<div>ID: ${String(item.id)}</div>` +
        `<div>Type: ${String(item.type)}</div>` +
        `<div>Rarity: ${String(item.rarity)}</div>` +
        '</div>'
      )),
      '</div>'
    ].join('')
    this.el.innerHTML = html
    const cards = this.el.querySelectorAll('.card')
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const id = Number(card.getAttribute('data-id'))
        try {
          if (typeof ex.commit_choice === 'function') { ex.commit_choice(id) }
          this.hide()
        } catch (_e) {}
      })
    })
  }
}


