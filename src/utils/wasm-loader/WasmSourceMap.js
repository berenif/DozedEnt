const SOURCE_MAP_PROPS = [
  'sourceMapURL',
  '_sourceMapURL',
  'sourceMap',
  '_sourceMap',
  'sourceMappingURL',
  '_sourceMappingURL',
  'sourceMapData',
  '_sourceMapData',
  'debugInfo',
  '_debugInfo',
  'debugSymbols',
  '_debugSymbols'
];

function safeDelete(target, prop) {
  if (!target || !(prop in target)) {
    return;
  }

  try {
    delete target[prop];
  } catch {
    // Ignore deletion errors
  }
}

function scrubTarget(target) {
  if (!target || typeof target !== 'object') {
    return;
  }

  SOURCE_MAP_PROPS.forEach(prop => safeDelete(target, prop));

  if ('sourceMapURL' in target) {
    const value = target.sourceMapURL;
    if (value === null || value === '' || typeof value === 'undefined') {
      safeDelete(target, 'sourceMapURL');
    }
  }
}

export function clearSourceMapReferences(instance, moduleRef = null, { logger = console } = {}) {
  if (!instance && !moduleRef) {
    return;
  }

  try {
    const moduleTarget = moduleRef && typeof moduleRef === 'object'
      ? moduleRef
      : instance && typeof instance.module === 'object'
        ? instance.module
        : null;

    scrubTarget(instance);

    if (instance && typeof instance.exports === 'object') {
      scrubTarget(instance.exports);
    }

    scrubTarget(moduleTarget);

    if (moduleTarget && typeof moduleTarget === 'object') {
      try {
        Object.keys(moduleTarget).forEach(key => {
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes('source') || lowerKey.includes('map') || lowerKey.includes('debug')) {
            safeDelete(moduleTarget, key);
          }
        });
      } catch {
        // Ignore key iteration errors
      }
    }

    if (typeof window !== 'undefined' && window.WebAssembly) {
      try {
        const moduleProto = window.WebAssembly.Module?.prototype;
        const instanceProto = window.WebAssembly.Instance?.prototype;

        SOURCE_MAP_PROPS.forEach(prop => {
          const moduleValue = moduleProto?.[prop];
          const instanceValue = instanceProto?.[prop];

          if (moduleValue === null || moduleValue === '' || typeof moduleValue === 'undefined') {
            safeDelete(moduleProto, prop);
          }

          if (instanceValue === null || instanceValue === '' || typeof instanceValue === 'undefined') {
            safeDelete(instanceProto, prop);
          }
        });
      } catch (protoError) {
        logger.debug?.('Source map prototype cleanup warning:', protoError.message);
      }
    }
  } catch (error) {
    logger.debug?.('Source map cleanup warning:', error.message);
  }
}

export function cleanupGlobalSourceMaps({ logger = console } = {}) {
  try {
    if (typeof globalThis !== 'undefined') {
      ['sourceMapURL', '_sourceMapURL', 'sourceMap', '_sourceMap'].forEach(prop => {
        const value = globalThis[prop];
        if (value === null || value === '' || typeof value === 'undefined') {
          try {
            delete globalThis[prop];
          } catch {
            // Ignore deletion errors
          }
        }
      });
    }

    if (typeof window !== 'undefined' && window.WebAssembly) {
      ['Module', 'Instance'].forEach(type => {
        const proto = window.WebAssembly[type]?.prototype;
        if (!proto) {
          return;
        }

        SOURCE_MAP_PROPS.forEach(prop => {
          const value = proto[prop];
          if (value === null || value === '' || typeof value === 'undefined') {
            safeDelete(proto, prop);
          }
        });
      });
    }
  } catch (error) {
    logger.debug?.('Global source map cleanup warning:', error.message);
  }
}
