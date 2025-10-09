/**
 * Cache Buster Utility
 * Helps clear browser cache issues during development
 */

export class CacheBuster {
  constructor() {
    this.buildVersion = Date.now();
  }

  /**
   * Add cache-busting query parameter to URL
   * @param {string} url - The URL to bust cache for
   * @returns {string} URL with cache-busting parameter
   */
  bustUrl(url) {
    if (!url) {
      return url;
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${this.buildVersion}`;
  }

  /**
   * Clear all localStorage and sessionStorage
   */
  clearStorage() {
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log('✅ Storage cleared');
    } catch (error) {
      console.warn('⚠️ Could not clear storage:', error);
    }
  }

  /**
   * Force hard reload of the page
   */
  hardReload() {
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload(true);
    }
  }

  /**
   * Check if we're running on the correct dev server
   * @returns {boolean} True if on proper dev server
   */
  isProperDevServer() {
    if (typeof window === 'undefined' || !window.location) {
      return false;
    }

    const port = window.location.port;
    const hostname = window.location.hostname;

    // Check if we're on the proper dev server (port 8080)
    // Or on production (github.io)
    const isDevServer = port === '8080' || port === '';
    const isProduction = hostname.includes('github.io');

    return isDevServer || isProduction;
  }

  /**
   * Show warning if using wrong dev server
   */
  checkDevServer() {
    if (typeof window === 'undefined' || !window.location) {
      return;
    }

    const port = window.location.port;
    
    // Check if using VS Code Live Server (common ports: 5500, 5501, 5502)
    if (port === '5500' || port === '5501' || port === '5502') {
      console.warn(
        '%c⚠️ WARNING: Using VS Code Live Server',
        'color: orange; font-size: 16px; font-weight: bold;'
      );
      console.warn(
        '%cVS Code Live Server does NOT serve WASM files correctly!',
        'color: orange; font-size: 14px;'
      );
      console.warn(
        '%cPlease use the proper dev server instead:',
        'color: orange; font-size: 14px;'
      );
      console.log(
        '%c  npm run dev',
        'color: cyan; font-size: 14px; font-weight: bold;'
      );
      console.log(
        '%cThen open: http://localhost:8080',
        'color: cyan; font-size: 14px;'
      );
      
      // Show in-page warning
      this.showInPageWarning();
    }
  }

  /**
   * Show in-page warning banner
   */
  showInPageWarning() {
    if (typeof document === 'undefined') {
      return;
    }

    const banner = document.createElement('div');
    banner.id = 'dev-server-warning';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
      color: white;
      padding: 16px;
      text-align: center;
      font-family: 'Segoe UI', sans-serif;
      font-size: 14px;
      z-index: 999999;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      animation: slideDown 0.3s ease-out;
    `;

    banner.innerHTML = `
      <style>
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
      </style>
      <strong>⚠️ Wrong Dev Server Detected!</strong><br>
      WASM files will NOT load correctly on VS Code Live Server.<br>
      <strong>Stop this server and run: <code style="background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 3px;">npm run dev</code></strong>
      <button id="dismiss-warning" style="margin-left: 12px; padding: 4px 12px; background: rgba(255,255,255,0.2); border: 1px solid white; border-radius: 4px; color: white; cursor: pointer;">Dismiss</button>
    `;

    document.body.appendChild(banner);

    // Dismiss button
    const dismissBtn = document.getElementById('dismiss-warning');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        banner.style.animation = 'slideDown 0.3s ease-out reverse';
        setTimeout(() => banner.remove(), 300);
      });
    }

    // Auto-dismiss after 15 seconds
    setTimeout(() => {
      if (banner.parentNode) {
        banner.style.animation = 'slideDown 0.3s ease-out reverse';
        setTimeout(() => banner.remove(), 300);
      }
    }, 15000);
  }
}

// Create global instance
export const globalCacheBuster = new CacheBuster();

// Auto-check on load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      globalCacheBuster.checkDevServer();
    });
  } else {
    globalCacheBuster.checkDevServer();
  }
}

