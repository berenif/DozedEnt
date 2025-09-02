import puppeteer from 'puppeteer';

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Collect failed requests
        const failedRequests = [];
        page.on('requestfailed', request => {
            failedRequests.push({
                url: request.url(),
                failure: request.failure()
            });
        });
        
        page.on('response', response => {
            if (response.status() >= 400) {
                failedRequests.push({
                    url: response.url(),
                    status: response.status()
                });
            }
        });
        
        // Navigate to the game
        console.log('Loading game page...');
        await page.goto('http://localhost:8000/', {
            waitUntil: 'networkidle2',
            timeout: 10000
        });
        
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Report failed requests
        if (failedRequests.length > 0) {
            console.log('\n=== Failed Resource Loads ===');
            failedRequests.forEach(req => {
                console.log(`- ${req.url}`);
                if (req.status) console.log(`  Status: ${req.status}`);
                if (req.failure) console.log(`  Failure: ${req.failure.errorText}`);
            });
        } else {
            console.log('\n✓ All resources loaded successfully');
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();