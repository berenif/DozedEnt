import puppeteer from 'puppeteer';

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Collect console messages
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push({
                type: msg.type(),
                text: msg.text()
            });
        });
        
        // Collect page errors
        const pageErrors = [];
        page.on('pageerror', error => {
            pageErrors.push(error.toString());
        });
        
        // Navigate to the game
        console.log('Loading game page...');
        await page.goto('http://localhost:8000/', {
            waitUntil: 'networkidle2',
            timeout: 10000
        });
        
        // Wait a bit for any async operations
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check for specific elements
        const hasCanvas = await page.evaluate(() => {
            return document.getElementById('gameCanvas') !== null;
        });
        
        const hasControls = await page.evaluate(() => {
            return document.querySelector('.game-container') !== null;
        });
        
        // Report results
        console.log('\n=== Game Loading Test Results ===\n');
        
        if (hasCanvas && hasControls) {
            console.log('✓ Game UI elements loaded successfully');
        } else {
            console.log('✗ Missing game UI elements');
            if (!hasCanvas) console.log('  - gameCanvas not found');
            if (!hasControls) console.log('  - game-container not found');
        }
        
        // Report console messages
        const errors = consoleMessages.filter(m => m.type === 'error');
        const warnings = consoleMessages.filter(m => m.type === 'warning');
        
        if (errors.length > 0) {
            console.log('\n✗ JavaScript Errors:');
            errors.forEach(e => console.log('  -', e.text));
        }
        
        if (warnings.length > 0) {
            console.log('\n⚠ Warnings:');
            warnings.forEach(w => console.log('  -', w.text));
        }
        
        if (pageErrors.length > 0) {
            console.log('\n✗ Page Errors:');
            pageErrors.forEach(e => console.log('  -', e));
        }
        
        if (errors.length === 0 && pageErrors.length === 0) {
            console.log('\n✓ No JavaScript errors detected');
        }
        
        // Check if game modules loaded
        const moduleStatus = await page.evaluate(() => {
            return {
                gameRenderer: typeof window.gameRenderer !== 'undefined',
                cameraEffects: typeof window.cameraEffects !== 'undefined',
                wolfAISystem: typeof window.wolfAISystem !== 'undefined',
                roomManager: typeof window.roomManager !== 'undefined'
            };
        });
        
        console.log('\n=== Module Status ===');
        Object.entries(moduleStatus).forEach(([module, loaded]) => {
            console.log(`${loaded ? '✓' : '✗'} ${module}: ${loaded ? 'Loaded' : 'Not loaded'}`);
        });
        
        if (Object.values(moduleStatus).every(v => v)) {
            console.log('\n✓✓✓ Game is working correctly! All modules loaded successfully.');
        } else {
            console.log('\n⚠ Some modules failed to load. Check the errors above.');
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();