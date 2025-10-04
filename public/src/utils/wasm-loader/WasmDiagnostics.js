export async function runWasmDiagnostics(moduleName, { resourceFetcher, logger = console } = {}) {
  const targetModule = moduleName || 'game';
  logger.log?.(`Running WASM diagnostics for module: ${targetModule}`);

  const diagnostics = {
    browserSupport: {
      webAssembly: typeof WebAssembly !== 'undefined',
      instantiate: typeof WebAssembly?.instantiate === 'function',
      compile: typeof WebAssembly?.compile === 'function',
      instantiateStreaming: typeof WebAssembly?.instantiateStreaming === 'function',
      compileStreaming: typeof WebAssembly?.compileStreaming === 'function'
    },
    networkTests: [],
    fileTests: [],
    memoryTests: {},
    errors: []
  };

  if (!diagnostics.browserSupport.webAssembly) {
    diagnostics.errors.push('WebAssembly not supported in this browser');
    return diagnostics;
  }

  const paths = resourceFetcher?.resolveModulePaths(targetModule) || [];

  for (const path of paths.slice(0, 3)) {
    try {
      logger.log?.(`Testing network access to: ${path}`);
      const startTime = performance.now();
      const response = await fetch(path, { method: 'HEAD' });
      const responseTime = performance.now() - startTime;

      diagnostics.networkTests.push({
        path,
        status: response.status,
        statusText: response.statusText,
        responseTime: responseTime.toFixed(2),
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
        success: response.ok
      });

      if (response.ok) {
        logger.log?.(`Network test passed: ${path} (${responseTime.toFixed(2)}ms)`);
      } else {
        logger.warn?.(`Network test failed: ${path} - ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      diagnostics.networkTests.push({
        path,
        error: error.message,
        success: false
      });
      logger.warn?.(`Network test error: ${path} - ${error.message}`);
    }
  }

  for (const path of paths.slice(0, 2)) {
    try {
      logger.log?.(`Testing file loading from: ${path}`);
      const startTime = performance.now();
      const response = await fetch(path);
      const arrayBuffer = await response.arrayBuffer();
      const loadTime = performance.now() - startTime;

      const fileTest = {
        path,
        size: arrayBuffer.byteLength,
        loadTime: loadTime.toFixed(2),
        success: true
      };

      logger.log?.(`File load test passed: ${path} (${arrayBuffer.byteLength} bytes in ${loadTime.toFixed(2)}ms)`);

      try {
        logger.log?.('Testing WASM compilation...');
        const compileStart = performance.now();
        await WebAssembly.compile(arrayBuffer);
        const compileTime = performance.now() - compileStart;
        fileTest.compilation = {
          success: true,
          time: compileTime.toFixed(2)
        };
        logger.log?.(`WASM compilation test passed (${compileTime.toFixed(2)}ms)`);
      } catch (compileError) {
        fileTest.compilation = {
          success: false,
          error: compileError.message
        };
        logger.warn?.(`WASM compilation test failed: ${compileError.message}`);
      }

      diagnostics.fileTests.push(fileTest);
    } catch (error) {
      diagnostics.fileTests.push({
        path,
        error: error.message,
        success: false
      });
      logger.warn?.(`File load test error: ${path} - ${error.message}`);
    }
  }

  try {
    diagnostics.memoryTests = {
      totalMemory: navigator.deviceMemory || 'unknown',
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
      userAgent: navigator.userAgent || 'unknown'
    };
  } catch (error) {
    diagnostics.memoryTests.error = error.message;
  }

  logger.log?.('Diagnostics complete:', diagnostics);
  return diagnostics;
}
