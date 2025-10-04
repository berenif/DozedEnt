import {mkErr} from './utils.js'
import {createLogger} from './logger.js'

export const normalizeConfig = config => {
  if (!config) {
    throw mkErr('requires a config map as the first argument')
  }

  const normalized = {...config}

  normalized.logger = createLogger(config.logger)
  normalized.rtcConfig ||= {}

  return normalized
}


