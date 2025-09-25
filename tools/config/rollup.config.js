import commonJs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'

const ecma = 2019
const nodeEnv = '"production"'
const isDev = process.env.NODE_ENV === 'development'

const ignoreCodes = new Set(['THIS_IS_UNDEFINED', 'CIRCULAR_DEPENDENCY'])

const onwarn = (warning, warn) => {
  if (ignoreCodes.has(warning.code)) return
  warn(warning)
}

const baseConfig = {
  onwarn,
  context: 'globalThis',
  output: {
    compact: !isDev,
    format: 'es',
    inlineDynamicImports: true,
    sourcemap: isDev, // Enable source maps in development
    sourcemapFile: isDev ? undefined : false
  },
  plugins: [
    resolve({
      browser: true, 
      preferBuiltins: false,
      exportConditions: ['browser', 'module', 'import', 'default']
    }),
    commonJs({
      include: ['node_modules/**'],
      transformMixedEsModules: true
    }),
    replace({
      'process.env.NODE_ENV': nodeEnv,
      'process?.env?.NODE_ENV': nodeEnv,
      preventAssignment: true
    }),
    ...(isDev ? [] : [
      terser({
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
          passes: 2 // Multiple passes for better optimization
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
      })
    ])
  ]
}

export default ['firebase', 'ipfs', 'mqtt', 'nostr', 'supabase', 'torrent', 'wasm'].map(
  name => ({
    ...baseConfig,
    input: name === 'wasm' ? `src/utils/${name}.js` : `src/netcode/${name}.js`,
    output: {
      ...baseConfig.output,
      file: `dist/core/trystero-${name}.min.js`
    }
  })
)


