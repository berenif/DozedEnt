/**
 * Alert System for DozedEnt
 * 
 * Provides a comprehensive toast notification system with:
 * - Spam protection and cooldown management
 * - Multiple alert types (info, success, warning, error)
 * - Auto-dismissal with configurable lifetime
 * - Accessibility support with ARIA attributes
 * - HTML content support with XSS protection
 * - Queue management for multiple alerts
 * 
 * Follows WASM-first architecture - UI layer only, no game logic
 */

export class AlertSystem {
    constructor(options = {}) {
        // Configuration options
        this.options = {
            toastLifetime: options.toastLifetime || 4800, // 4.8 seconds
            alertCooldown: options.alertCooldown || 2000, // 2 seconds between alerts
            maxActiveAlerts: options.maxActiveAlerts || 3, // Maximum 3 alerts at once
            containerId: options.containerId || 'toast-stack', // Container element ID
            enableSpamProtection: options.enableSpamProtection !== false, // Default true
            enableAccessibility: options.enableAccessibility !== false, // Default true
            ...options
        };

        // State tracking
        this.lastAlertTime = 0;
        this.activeAlerts = 0;
        this.toastStack = null;
        this.initialized = false;

        // Icon mappings for different alert types
        this.toastIcons = {
            info: 'i',
            success: '+',
            warning: '!',
            error: 'x'
        };

        // Initialize the system
        this.initialize();
    }

    /**
     * Initialize the alert system
     */
    initialize() {
        if (this.initialized) {
            return;
        }

        // Find or create the toast container
        this.toastStack = document.getElementById(this.options.containerId);
        
        if (!this.toastStack) {
            // Create toast container if it doesn't exist
            this.toastStack = document.createElement('div');
            this.toastStack.id = this.options.containerId;
            this.toastStack.className = 'ui-toast-stack';
            
            // Add accessibility attributes
            if (this.options.enableAccessibility) {
                this.toastStack.setAttribute('aria-live', 'assertive');
                this.toastStack.setAttribute('aria-atomic', 'true');
            }
            
            // Add to document
            document.body.appendChild(this.toastStack);
        }

        this.initialized = true;
    }

    /**
     * Show an alert toast notification
     * @param {string} message - The message to display
     * @param {string} type - Alert type: 'info', 'success', 'warning', 'error'
     * @param {Object} options - Additional options
     * @returns {boolean} - Whether the alert was shown (false if suppressed)
     */
    showAlert(message, type = 'error', options = {}) {
        if (!this.initialized) {
            this.initialize();
        }

        const now = Date.now();

        // Spam protection
        if (this.options.enableSpamProtection) {
            // Check cooldown
            if (now - this.lastAlertTime < this.options.alertCooldown) {
                this.logSpamSuppression('cooldown');
                return false;
            }

            // Check maximum active alerts
            if (this.activeAlerts >= this.options.maxActiveAlerts) {
                this.logSpamSuppression('max-alerts');
                return false;
            }
        }

        // Update tracking
        this.lastAlertTime = now;
        this.activeAlerts++;

        // Create toast element
        const toast = this.createToastElement(message, type, options);
        
        // Add to container
        if (this.toastStack) {
            this.toastStack.prepend(toast);
        } else {
            document.body.appendChild(toast);
        }

        // Set up auto-dismissal
        const lifetime = options.lifetime || this.options.toastLifetime;
        this.setupAutoDismiss(toast, lifetime);

        return true;
    }

    /**
     * Create a toast element
     * @param {string} message - The message content
     * @param {string} type - Alert type
     * @param {Object} options - Additional options
     * @returns {HTMLElement} - The created toast element
     */
    createToastElement(message, type, _options = {}) {
        const toast = document.createElement('div');
        toast.className = `ui-toast ${type}`;
        
        // Add accessibility attributes
        if (this.options.enableAccessibility) {
            toast.setAttribute('role', 'alert');
            toast.setAttribute('aria-live', 'assertive');
        }

        // Create icon
        const icon = document.createElement('span');
        icon.className = `toast-icon ${type}`;
        icon.textContent = this.toastIcons[type] || this.toastIcons.info;

        // Create message body
        const body = document.createElement('div');
        body.className = 'toast-message';
        body.innerHTML = this.formatMessageForDisplay(message);

        // Assemble toast
        toast.append(icon, body);

        // Add click-to-dismiss functionality
        toast.addEventListener('click', () => this.dismissToast(toast));

        return toast;
    }

    /**
     * Set up auto-dismissal for a toast
     * @param {HTMLElement} toast - The toast element
     * @param {number} lifetime - Lifetime in milliseconds
     */
    setupAutoDismiss(toast, lifetime) {
        setTimeout(() => {
            this.dismissToast(toast);
        }, lifetime);
    }

    /**
     * Dismiss a toast with animation
     * @param {HTMLElement} toast - The toast element to dismiss
     */
    dismissToast(toast) {
        if (!toast || toast.classList.contains('closing')) {
            return;
        }

        toast.classList.add('closing');
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
            this.activeAlerts = Math.max(0, this.activeAlerts - 1);
        }, 320); // Animation duration
    }

    /**
     * Format message for safe HTML display
     * @param {string} message - The message to format
     * @returns {string} - HTML-safe formatted message
     */
    formatMessageForDisplay(message) {
        return this.escapeForHtml(message).replace(/\r?\n/g, '<br>');
    }

    /**
     * Escape HTML special characters
     * @param {string} value - The value to escape
     * @returns {string} - HTML-escaped value
     */
    escapeForHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * Log spam suppression events
     * @param {string} reason - Reason for suppression
     */
    logSpamSuppression(reason) {
        const messages = {
            'cooldown': 'Alert suppressed to avoid spam (2s cooldown)',
            'max-alerts': 'Alert suppressed - too many active notices'
        };
        
        console.log(messages[reason] || 'Alert suppressed');
    }

    /**
     * Clear all active alerts
     */
    clearAllAlerts() {
        const alerts = document.querySelectorAll('.ui-toast');
        alerts.forEach(alert => {
            if (alert.parentElement) {
                alert.remove();
            }
        });
        this.activeAlerts = 0;
        console.log('All alerts cleared');
    }

    /**
     * Get current alert system status
     * @returns {Object} - Status information
     */
    getStatus() {
        const now = Date.now();
        const timeSinceLastAlert = now - this.lastAlertTime;
        const cooldownRemaining = Math.max(0, this.options.alertCooldown - timeSinceLastAlert);

        return {
            activeAlerts: this.activeAlerts,
            maxActiveAlerts: this.options.maxActiveAlerts,
            cooldownRemaining: cooldownRemaining,
            timeSinceLastAlert: timeSinceLastAlert,
            initialized: this.initialized,
            spamProtectionEnabled: this.options.enableSpamProtection
        };
    }

    /**
     * Show alert system status
     */
    showStatus() {
        const status = this.getStatus();
        
        console.log('=== Alert System Status ===');
        console.log(`Active alerts: ${status.activeAlerts}/${status.maxActiveAlerts}`);
        console.log(`Cooldown remaining: ${Math.ceil(status.cooldownRemaining / 1000)}s`);
        console.log(`Last alert: ${Math.ceil(status.timeSinceLastAlert / 1000)}s ago`);
        console.log(`Spam protection: ${status.spamProtectionEnabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Update configuration options
     * @param {Object} newOptions - New options to merge
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
    }

    /**
     * Destroy the alert system and clean up
     */
    destroy() {
        this.clearAllAlerts();
        
        if (this.toastStack && this.toastStack.parentElement) {
            this.toastStack.remove();
        }
        
        this.initialized = false;
        this.activeAlerts = 0;
        this.lastAlertTime = 0;
    }
}

// Convenience functions for common alert types
export const AlertTypes = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
};

// Global alert system instance (optional)
let globalAlertSystem = null;

/**
 * Initialize global alert system
 * @param {Object} options - Configuration options
 * @returns {AlertSystem} - The global alert system instance
 */
export function initializeGlobalAlertSystem(options = {}) {
    if (!globalAlertSystem) {
        globalAlertSystem = new AlertSystem(options);
    }
    return globalAlertSystem;
}

/**
 * Get global alert system instance
 * @returns {AlertSystem|null} - The global alert system instance
 */
export function getGlobalAlertSystem() {
    return globalAlertSystem;
}

/**
 * Show alert using global system
 * @param {string} message - The message to display
 * @param {string} type - Alert type
 * @param {Object} options - Additional options
 * @returns {boolean} - Whether the alert was shown
 */
export function showAlert(message, type = AlertTypes.ERROR, options = {}) {
    if (!globalAlertSystem) {
        globalAlertSystem = initializeGlobalAlertSystem();
    }
    return globalAlertSystem.showAlert(message, type, options);
}

/**
 * Clear all alerts using global system
 */
export function clearAllAlerts() {
    if (globalAlertSystem) {
        globalAlertSystem.clearAllAlerts();
    }
}

/**
 * Show alert system status using global system
 */
export function showAlertStatus() {
    if (globalAlertSystem) {
        globalAlertSystem.showStatus();
    }
}

/**
 * Show WebTorrent tracker connection error with fallback options
 */
export function showWebTorrentError(trackerUrl, _errorMessage) {
    if (!globalAlertSystem) {
        globalAlertSystem = initializeGlobalAlertSystem();
    }
    
    return globalAlertSystem.showAlert({
        type: 'warning',
        title: 'WebTorrent Tracker Unavailable',
        message: `Cannot connect to tracker: ${trackerUrl}. This may be due to network restrictions or tracker downtime.`,
        duration: 0,
        actions: [
            {
                text: 'Try Alternative Provider',
                action: () => {
                    globalAlertSystem.hideAlert();
                    if (typeof window !== 'undefined' && window.gameDebug && window.gameDebug.networkErrorRecovery) {
                        window.gameDebug.networkErrorRecovery.executeRecoveryStrategy('switch_network_provider', {
                            networkManager: window.networkManager,
                            reason: 'webtorrent_tracker_failure'
                        });
                    }
                }
            },
            {
                text: 'Continue Offline',
                action: () => {
                    globalAlertSystem.hideAlert();
                    if (typeof window !== 'undefined' && window.gameDebug && window.gameDebug.networkErrorRecovery) {
                        window.gameDebug.networkErrorRecovery.executeRecoveryStrategy('offline_mode');
                    }
                }
            }
        ]
    });
}
