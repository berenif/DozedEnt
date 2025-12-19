// ShopOverlay.js
// Minimal overlay for CashOut phase: list items, buy, reroll, heal

export class ShopOverlay {
  constructor({ modalId, wasmApi }) {
    this.el = document.getElementById(modalId)
    this.api = wasmApi
  }

  show() {
    if (!this.el) {return}
    this.el.classList.add('active')
    this.render()
  }

  hide() {
    if (!this.el) {return}
    this.el.classList.remove('active')
  }

  render() {
    const ex = this.api.exports || {}
    const count = typeof ex.get_shop_item_count === 'function' ? Math.max(0, ex.get_shop_item_count() | 0) : 0
    const items = []
    for (let i = 0; i < count; i += 1) {
      items.push({ index: i })
    }
    const actions = [
      '<div class="row" style="justify-content: space-between; align-items: center">',
      '<h3>Shop</h3>',
      '<div>',
      '<button id="buyHeal">Buy Heal</button> ',
      '<button id="reroll">Reroll</button>',
      '</div>',
      '</div>'
    ].join('')
    const html = [
      actions,
      '<div class="shop">',
      ...items.map(item => (
        `<div class="card">` +
        `<div>Item #${String(item.index)}</div>` +
        `<div><button data-buy="${String(item.index)}">Buy</button></div>` +
        `</div>`
      )),
      '</div>'
    ].join('')
    this.el.innerHTML = html
    const buyBtns = this.el.querySelectorAll('[data-buy]')
    buyBtns.forEach(btn => btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-buy'))
      try {
        if (typeof ex.buy_shop_item === 'function') { ex.buy_shop_item(idx) }
      } catch (_e) {
        // Silently handle purchase errors
      }
      this.render()
    }))
    const buyHeal = this.el.querySelector('#buyHeal')
    buyHeal?.addEventListener('click', () => {
      try {
        if (typeof ex.buy_heal === 'function') { ex.buy_heal() }
      } catch (_e) {
        // Silently handle heal errors
      }
      this.render()
    })
    const reroll = this.el.querySelector('#reroll')
    reroll?.addEventListener('click', () => {
      try {
        if (typeof ex.reroll_shop_items === 'function') { ex.reroll_shop_items() }
      } catch (_e) {
        // Silently handle reroll errors
      }
      this.render()
    })
  }
}


