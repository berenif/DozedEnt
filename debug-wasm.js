// Debug script to test WASM loading
console.log('Starting WASM debug test...')

async function testWasmLoading() {
  try {
    console.log('1. Testing local WASM helper import...')
    const wasmHelperModule = await import('./dist/trystero-wasm.min.js')
    console.log('✓ Local WASM helper imported successfully')
    console.log('WASM helper module:', wasmHelperModule)
    
    console.log('2. Testing loadWasm function...')
    const {loadWasm} = wasmHelperModule
    console.log('loadWasm function:', loadWasm)
    
    console.log('3. Testing WASM loading...')
    const {exports} = await loadWasm('./game.wasm')
    console.log('✓ WASM loaded successfully')
    console.log('WASM exports:', exports)
    
    console.log('4. Testing WASM functions...')
    if (typeof exports.start === 'function') {
      console.log('✓ start() function exists')
      exports.start()
      console.log('✓ start() function called')
    } else {
      console.log('✗ start() function missing')
    }
    
    if (typeof exports.update === 'function') {
      console.log('✓ update() function exists')
    } else {
      console.log('✗ update() function missing')
    }
    
    console.log('✓ All WASM tests passed!')
    
  } catch (error) {
    console.error('✗ WASM loading failed:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
  }
}

testWasmLoading()