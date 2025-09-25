import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'

const ecma = 2019

export default {
  input: 'src/animation/enemy/wolf-animation.js',
  output: [
    {
      file: 'dist/wolf-animation.js',
      format: 'es',
      sourcemap: true
    },
    {
      file: 'dist/wolf-animation.min.js',
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
      file: 'dist/wolf-animation.umd.js',
      format: 'umd',
      name: 'WolfAnimationSystem',
      sourcemap: true
    }
  ],
  plugins: [
    resolve({browser: true, preferBuiltins: false})
  ],
  external: [
    // Bundle animation-system into the output
    // './animation-system.js',
    './particle-system.js'
  ]
}