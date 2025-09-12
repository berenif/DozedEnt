const levels = ['none', 'error', 'warn', 'info', 'debug']

export const createLogger = (options = {}) => {
  const {level = 'warn', prefix = 'Trystero'} = options || {}
  const idx = levels.includes(level) ? levels.indexOf(level) : levels.indexOf('warn')

  const should = l => levels.indexOf(l) <= idx && idx > 0
  const tag = l => `[${prefix}:${l}]`

  return {
    error: (...args) => should('error') && console.error(tag('error'), ...args),
    warn: (...args) => should('warn') && console.warn(tag('warn'), ...args),
    info: (...args) => should('info') && console.info(tag('info'), ...args),
    debug: (...args) => should('debug') && console.debug(tag('debug'), ...args)
  }
}


