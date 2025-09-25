import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'

const ecma = 2019
const isDev = process.env.NODE_ENV === 'development'

const ignoreCodes = new Set(['THIS_IS_UNDEFINED'])
const onwarn = (warning, warn) => {
  if (ignoreCodes.has(warning.code)) return
  warn(warning)
}

const terserConfig = {
  compress: {
    ecma,
    drop_console: ['log', 'info', 'debug'],
    drop_debugger: true,
    keep_fargs: false,
    module: true,
    toplevel: true,
    unsafe: true,
    unsafe_arrows: true,
    unsafe_methods: true,
    unsafe_proto: true,
    unsafe_symbols: true,
    passes: 2
  },
  format: {
    comments: false, 
    ecma,
    beautify: false
  },
  mangle: {
    module: true, 
    toplevel: true,
    properties: {
      regex: /^_/
    }
  }
}

export default {
  onwarn,
  context: 'globalThis',
  input: 'src/animation/player/procedural/player-animator.js',
  output: [
    {
      file: 'dist/animations/player-animator.js',
      format: 'es',
      sourcemap: isDev,
      sourcemapFile: isDev ? 'dist/sourcemaps/player-animator.js.map' : false
    },
    {
      file: 'dist/animations/player-animator.min.js',
      format: 'es',
      compact: !isDev,
      sourcemap: isDev,
      sourcemapFile: isDev ? 'dist/sourcemaps/player-animator.min.js.map' : false,
      plugins: isDev ? [] : [terser(terserConfig)]
    },
    {
      file: 'dist/animations/player-animator.umd.js',
      format: 'umd',
      exports: 'named',
      name: 'AnimatedPlayer',
      sourcemap: isDev,
      sourcemapFile: isDev ? 'dist/sourcemaps/player-animator.umd.js.map' : false
    }
  ],
  plugins: [
    resolve({
      browser: true, 
      preferBuiltins: false,
      exportConditions: ['browser', 'module', 'import', 'default']
    })
  ],
  external: [
    './sound-system.js',
    './particle-system.js'
  ]
}


