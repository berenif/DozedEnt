import commonJs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'

const ecma = 2019
const nodeEnv = '"production"'

const ignoreCodes = new Set(['THIS_IS_UNDEFINED', 'CIRCULAR_DEPENDENCY'])

const onwarn = (warning, warn) => {
  if (ignoreCodes.has(warning.code)) return
  warn(warning)
}

const baseConfig = {
  onwarn,
  context: 'globalThis',
  output: {
    compact: true,
    format: 'es',
    inlineDynamicImports: true,
    sourcemap: false  // Disable source maps for production builds
  },
  plugins: [
    resolve({browser: true, preferBuiltins: false}),
    commonJs(),
    replace({
      'process.env.NODE_ENV': nodeEnv,
      'process?.env?.NODE_ENV': nodeEnv,
      preventAssignment: true
    }),
    terser({
      compress: {
        ecma,
        drop_console: ['log', 'info'],
        keep_fargs: false,
        module: true,
        toplevel: true,
        unsafe: true,
        unsafe_arrows: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_symbols: true
      },
      format: {comments: false, ecma},
      mangle: {module: true, toplevel: true}
    })
  ]
}

export default ['firebase', 'ipfs', 'mqtt', 'supabase', 'torrent', 'wasm'].map(
  name => ({
    ...baseConfig,
    input: name === 'wasm' ? `src/utils/${name}.js` : `src/netcode/${name}.js`,
    output: {
      ...baseConfig.output,
      file: `dist/trystero-${name}.min.js`
    }
  })
)


