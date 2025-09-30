/**
 * Desktop UI Manager
 * Optimized UI experience for keyboard/mouse users
 * Following single responsibility and modular design principles
 */

export class DesktopUIManager {
    constructor() {
        this.elements = {
            controlsHint: null,
            statusBar: null,
            quickActionsBar: null
        };
        
        this.isInitialized = false;
        this.isVisible = false;
    }

    /**
     * Initialize desktop UI
     */
    init() {
        if (this.isInitialized) {
            return;
        }

        this.createDesktopUI();
        this.setupEventListeners();
        this.isInitialized = true;

        console.log('✅ Desktop UI Manager initialized');
    }

    /**
     * Create desktop-specific UI elements
     */
    createDesktopUI() {
        this.createControlsHint();
        this.createStatusBar();
        this.createQuickActionsBar();
    }

    /**
     * Create keyboard controls hint
     */
    createControlsHint() {
        const hint = document.createElement('div');
        hint.id = 'desktop-controls-hint';
        hint.className = 'desktop-controls-hint';
        hint.innerHTML = `
            <div class="controls-hint-content">
                <div class="controls-section">
                    <span class="controls-label">Move</span>
                    <div class="key-group">
                        <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
                    </div>
                </div>
                <div class="controls-section">
                    <span class="controls-label">Combat</span>
                    <div class="key-group">
                        <kbd>J</kbd> Light · <kbd>K</kbd> Heavy · <kbd>L</kbd> Special
                    </div>
                </div>
                <div class="controls-section">
                    <span class="controls-label">Defense</span>
                    <div class="key-group">
                        <kbd>Shift</kbd> Block · <kbd>Space</kbd> Roll
                    </div>
                </div>
                <button class="hint-toggle" title="Hide controls">
                    <span class="hint-icon">📋</span>
                </button>
            </div>
        `;

        document.body.appendChild(hint);
        this.elements.controlsHint = hint;

        // Setup toggle functionality
        const toggleBtn = hint.querySelector('.hint-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleControlsHint());
        }
    }

    /**
     * Create status bar for desktop
     */
    createStatusBar() {
        const statusBar = document.createElement('div');
        statusBar.id = 'desktop-status-bar';
        statusBar.className = 'desktop-status-bar';
        statusBar.innerHTML = `
            <div class="status-item" id="fps-counter">
                <span class="status-label">FPS:</span>
                <span class="status-value">60</span>
            </div>
            <div class="status-item" id="connection-status">
                <span class="status-indicator offline"></span>
                <span class="status-value">Offline</span>
            </div>
        `;

        document.body.appendChild(statusBar);
        this.elements.statusBar = statusBar;
    }

    /**
     * Create quick actions bar
     */
    createQuickActionsBar() {
        const actionsBar = document.createElement('div');
        actionsBar.id = 'desktop-quick-actions';
        actionsBar.className = 'desktop-quick-actions';
        actionsBar.innerHTML = `
            <button class="quick-action" data-action="pause" title="Pause (ESC)">
                <span class="action-icon">⏸️</span>
            </button>
            <button class="quick-action" data-action="fullscreen" title="Fullscreen (F11)">
                <span class="action-icon">⛶</span>
            </button>
            <button class="quick-action" data-action="settings" title="Settings">
                <span class="action-icon">⚙️</span>
            </button>
        `;

        document.body.appendChild(actionsBar);
        this.elements.quickActionsBar = actionsBar;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Quick actions
        const actions = this.elements.quickActionsBar?.querySelectorAll('.quick-action');
        actions?.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickAction(action);
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Fullscreen change
        document.addEventListener('fullscreenchange', () => this.updateFullscreenButton());
    }

    /**
     * Handle quick actions
     */
    handleQuickAction(action) {
        switch (action) {
            case 'pause':
                this.dispatchEvent('pause');
                break;
            case 'fullscreen':
                this.toggleFullscreen();
                break;
            case 'settings':
                this.dispatchEvent('settings');
                break;
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        // F11 - Fullscreen
        if (event.key === 'F11') {
            event.preventDefault();
            this.toggleFullscreen();
        }

        // ESC - Pause/Menu
        if (event.key === 'Escape') {
            this.dispatchEvent('pause');
        }

        // H - Toggle hints
        if (event.key === 'h' || event.key === 'H') {
            this.toggleControlsHint();
        }
    }

    /**
     * Toggle fullscreen
     */
    async toggleFullscreen() {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (error) {
            console.warn('⚠️ Fullscreen error:', error.message);
        }
    }

    /**
     * Update fullscreen button state
     */
    updateFullscreenButton() {
        const btn = this.elements.quickActionsBar?.querySelector('[data-action="fullscreen"]');
        if (btn) {
            const icon = btn.querySelector('.action-icon');
            if (icon) {
                icon.textContent = document.fullscreenElement ? '⛶' : '⛶';
            }
            btn.title = document.fullscreenElement ? 'Exit Fullscreen (F11)' : 'Fullscreen (F11)';
        }
    }

    /**
     * Toggle controls hint visibility
     */
    toggleControlsHint() {
        if (this.elements.controlsHint) {
            this.elements.controlsHint.classList.toggle('minimized');
        }
    }

    /**
     * Show desktop UI
     */
    show() {
        if (this.isVisible) {
            return;
        }

        Object.values(this.elements).forEach(element => {
            if (element) {
                element.style.display = '';
                element.classList.add('visible');
            }
        });

        this.isVisible = true;
        console.log('✅ Desktop UI shown');
    }

    /**
     * Hide desktop UI
     */
    hide() {
        if (!this.isVisible) {
            return;
        }

        Object.values(this.elements).forEach(element => {
            if (element) {
                element.style.display = 'none';
                element.classList.remove('visible');
            }
        });

        this.isVisible = false;
        console.log('✅ Desktop UI hidden');
    }

    /**
     * Update FPS counter
     */
    updateFPS(fps) {
        const fpsValue = this.elements.statusBar?.querySelector('#fps-counter .status-value');
        if (fpsValue) {
            fpsValue.textContent = Math.round(fps);
        }
    }

    /**
     * Update connection status
     */
    updateConnectionStatus(isOnline, playerCount = 0) {
        const statusIndicator = this.elements.statusBar?.querySelector('.status-indicator');
        const statusValue = this.elements.statusBar?.querySelector('#connection-status .status-value');

        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
        }

        if (statusValue) {
            statusValue.textContent = isOnline ? `Online (${playerCount})` : 'Offline';
        }
    }

    /**
     * Dispatch custom event
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(`desktop-ui:${eventName}`, { detail });
        document.dispatchEvent(event);
    }

    /**
     * Cleanup
     */
    cleanup() {
        // Remove UI elements
        Object.values(this.elements).forEach(element => {
            element?.remove();
        });

        this.elements = {};
        this.isInitialized = false;
        this.isVisible = false;

        console.log('✅ Desktop UI Manager cleaned up');
    }
}

export default DesktopUIManager;

