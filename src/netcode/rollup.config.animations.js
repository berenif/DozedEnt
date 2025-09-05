import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'

const ecma = 2019

export default {
  input: 'src/player-animator.js',
  output: [
    {
      file: 'dist/player-animator.js',
      format: 'es',
      sourcemap: true
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
      name: 'AnimatedPlayer',
      sourcemap: true
    }
  ],
  plugins: [
    resolve({browser: true, preferBuiltins: false})
  ],
  external: [
    // Bundle animation-system into the output so docs/dist has no external deps
    // './animation-system.js',
    './sound-system.js',
    './particle-system.js'
  ]
}