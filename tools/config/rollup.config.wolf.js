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
  input: 'src/animation/wolf-animation.js',
  output: [
    {
      file: 'dist/animations/wolf-animation.js',
      format: 'es',
      sourcemap: isDev,
      sourcemapFile: isDev ? 'dist/sourcemaps/wolf-animation.js.map' : false
    },
    {
      file: 'dist/animations/wolf-animation.min.js',
      format: 'es',
      compact: !isDev,
      sourcemap: isDev,
      sourcemapFile: isDev ? 'dist/sourcemaps/wolf-animation.min.js.map' : false,
      plugins: isDev ? [] : [terser(terserConfig)]
    },
    {
      file: 'dist/animations/wolf-animation.umd.js',
      format: 'umd',
      exports: 'named',
      name: 'WolfAnimationSystem',
      sourcemap: isDev,
      sourcemapFile: isDev ? 'dist/sourcemaps/wolf-animation.umd.js.map' : false
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
    './particle-system.js'
  ]
}


