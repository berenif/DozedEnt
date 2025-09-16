import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'

const ecma = 2019

const ignoreCodes = new Set(['THIS_IS_UNDEFINED'])
const onwarn = (warning, warn) => {
  if (ignoreCodes.has(warning.code)) return
  warn(warning)
}

export default {
  onwarn,
  context: 'globalThis',
  input: 'src/animation/player-animator.js',
  output: [
    {
      file: 'dist/player-animator.js',
      format: 'es',
      sourcemap: true,
      sourcemapFile: 'dist/player-animator.js.map'
    },
    {
      file: 'dist/player-animator.min.js',
      format: 'es',
      compact: true,
      plugins: [
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
    },
    {
      file: 'dist/player-animator.umd.js',
      format: 'umd',
      exports: 'named',
      name: 'AnimatedPlayer',
      sourcemap: true,
      sourcemapFile: 'dist/player-animator.umd.js.map'
    }
  ],
  plugins: [resolve({browser: true, preferBuiltins: false})],
  external: [
    './sound-system.js',
    './particle-system.js'
  ]
}