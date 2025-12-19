/**
 * LogPanel UI Component
 * Displays expedition log and event messages
 */
export class LogPanel {
    constructor(containerId, options = {}) {
        this.containerId = containerId
        this.options = {
            onExportLogs: options.onExportLogs || (() => {}),
            ...options
        }
        this.element = null
        this.logs = []
        this.maxLogs = 50
        this.logIcons = {
            info: 'i',
            success: '+',
            warning: '!',
            error: 'x'
        }
    }

    /**
     * Initialize the LogPanel component
     */
    init() {
        this.element = document.getElementById(this.containerId)
        if (!this.element) {
            throw new Error(`LogPanel container with id "${this.containerId}" not found`)
        }
        
        this.render()
        this.attachEventListeners()
        return this
    }

    /**
     * Render the LogPanel HTML structure
     */
    render() {
        this.element.innerHTML = `
            <section class="log-panel">
                <h3>Expedition Log</h3>
                <p class="section-hint">Signals, discoveries, and warnings appear here in real time.</p>
                <div id="event-log" class="log-feed">
                    <div class="log-entry info">
                        <span class="log-icon info">+</span>
                        <span class="timestamp">[00:10:17]</span>
                        <span class="log-message">BroadcastChannel initialized for room discovery</span>
                    </div>
                    <div class="log-entry info">
                        <span class="log-icon info">+</span>
                        <span class="timestamp">[00:10:17]</span>
                        <span class="log-message">Generated new peer name: "BoldChick"</span>
                    </div>
                    <div class="log-entry info">
                        <span class="log-icon info">+</span>
                        <span class="timestamp">[00:10:17]</span>
                        <span class="log-message">Network manager initialized</span>
                    </div>
                </div>
            </section>
        `
    }

    /**
     * Attach event listeners to the LogPanel component
     */
    attachEventListeners() {
        // Add context menu for log entries if needed
        const logFeed = this.element.querySelector('#event-log')
        if (logFeed) {
            logFeed.addEventListener('contextmenu', (event) => {
                event.preventDefault()
                this.showLogContextMenu(event)
            })
        }
    }

    /**
     * Add a log entry
     */
    addLog(message, type = 'info') {
        const logFeed = this.element.querySelector('#event-log')
        if (!logFeed) {return}

        const entry = document.createElement('div')
        entry.className = `log-entry ${type}`
        entry.dataset.type = type
        entry.setAttribute('role', 'log')

        const icon = document.createElement('span')
        icon.className = `log-icon ${type}`
        icon.textContent = this.logIcons[type] || this.logIcons.info

        const time = document.createElement('span')
        time.className = 'timestamp'
        time.textContent = `[${new Date().toLocaleTimeString()}]`

        const messageNode = document.createElement('span')
        messageNode.className = 'log-message'
        messageNode.innerHTML = this.formatMessageForDisplay(message)

        entry.append(icon, time, messageNode)
        logFeed.insertBefore(entry, logFeed.firstChild)

        // Add with animation
        entry.style.opacity = '0'
        entry.style.transform = 'translateX(-20px)'
        setTimeout(() => {
            entry.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
            entry.style.opacity = '1'
            entry.style.transform = 'translateX(0)'
        }, 10)

        // Keep only last N logs
        while (logFeed.children.length > this.maxLogs) {
            logFeed.removeChild(logFeed.lastChild)
        }

        // Store log entry
        this.logs.unshift({
            message,
            type,
            timestamp: new Date().toISOString(),
            displayTime: new Date().toLocaleTimeString()
        })

        // Keep only last N logs in memory
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs)
        }
    }

    /**
     * Clear all log entries
     */
    clearLogs() {
        const logFeed = this.element.querySelector('#event-log')
        if (!logFeed) {return}

        logFeed.innerHTML = `
            <div class="log-entry info">
                <span class="log-icon info">+</span>
                <span class="timestamp">[${new Date().toLocaleTimeString()}]</span>
                <span class="log-message">Log cleared. Expedition log ready.</span>
            </div>
        `

        this.logs = []
    }

    /**
     * Export logs to file
     */
    exportLogs() {
        const logText = this.logs.map(log => 
            `[${log.displayTime}] [${log.type.toUpperCase()}] ${log.message}`
        ).join('\n')
        
        const blob = new Blob([logText], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `expedition-log-${new Date().toISOString().split('T')[0]}.txt`
        a.click()
        URL.revokeObjectURL(url)

        this.options.onExportLogs(this.logs)
        this.addLog('Logs exported', 'success')
    }

    /**
     * Filter logs by type
     */
    filterLogs(type) {
        const logFeed = this.element.querySelector('#event-log')
        if (!logFeed) {return}

        const entries = logFeed.querySelectorAll('.log-entry')
        entries.forEach(entry => {
            if (type === 'all' || entry.dataset.type === type) {
                entry.style.display = ''
            } else {
                entry.style.display = 'none'
            }
        })
    }

    /**
     * Search logs for specific text
     */
    searchLogs(searchTerm) {
        const logFeed = this.element.querySelector('#event-log')
        if (!logFeed) {return}

        const entries = logFeed.querySelectorAll('.log-entry')
        entries.forEach(entry => {
            const messageElement = entry.querySelector('.log-message')
            if (messageElement) {
                const messageText = messageElement.textContent.toLowerCase()
                if (messageText.includes(searchTerm.toLowerCase())) {
                    entry.style.display = ''
                    entry.classList.add('search-highlight')
                } else {
                    entry.style.display = 'none'
                    entry.classList.remove('search-highlight')
                }
            }
        })
    }

    /**
     * Clear search highlights
     */
    clearSearchHighlights() {
        const logFeed = this.element.querySelector('#event-log')
        if (!logFeed) {return}

        const entries = logFeed.querySelectorAll('.log-entry')
        entries.forEach(entry => {
            entry.style.display = ''
            entry.classList.remove('search-highlight')
        })
    }

    /**
     * Show context menu for log entries
     */
    showLogContextMenu(event) {
        // Remove existing context menu
        const existingMenu = document.querySelector('.log-context-menu')
        if (existingMenu) {
            existingMenu.remove()
        }

        // Create context menu
        const menu = document.createElement('div')
        menu.className = 'log-context-menu'
        menu.style.position = 'fixed'
        menu.style.left = event.clientX + 'px'
        menu.style.top = event.clientY + 'px'
        menu.style.zIndex = '1000'
        menu.style.backgroundColor = '#2a2a2a'
        menu.style.border = '1px solid #444'
        menu.style.borderRadius = '4px'
        menu.style.padding = '8px'
        menu.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)'

        menu.innerHTML = `
            <div class="context-menu-item" data-action="export">Export Logs</div>
            <div class="context-menu-item" data-action="clear">Clear Logs</div>
            <div class="context-menu-item" data-action="filter-info">Show Info Only</div>
            <div class="context-menu-item" data-action="filter-error">Show Errors Only</div>
            <div class="context-menu-item" data-action="filter-all">Show All</div>
        `

        // Add event listeners
        menu.addEventListener('click', (e) => {
            const action = e.target.dataset.action
            switch (action) {
                case 'export':
                    this.exportLogs()
                    break
                case 'clear':
                    this.clearLogs()
                    break
                case 'filter-info':
                    this.filterLogs('info')
                    break
                case 'filter-error':
                    this.filterLogs('error')
                    break
                case 'filter-all':
                    this.filterLogs('all')
                    break
            }
            menu.remove()
        })

        document.body.appendChild(menu)

        // Remove menu when clicking elsewhere
        const removeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove()
                document.removeEventListener('click', removeMenu)
            }
        }
        setTimeout(() => {
            document.addEventListener('click', removeMenu)
        }, 10)
    }

    /**
     * Get current log data
     */
    getLogData() {
        return {
            logs: [...this.logs],
            count: this.logs.length,
            maxLogs: this.maxLogs
        }
    }

    /**
     * Set maximum number of logs to display
     */
    setMaxLogs(maxLogs) {
        this.maxLogs = maxLogs
        // Trim existing logs if needed
        if (this.logs.length > maxLogs) {
            this.logs = this.logs.slice(0, maxLogs)
        }
    }

    /**
     * Format message for display (escape HTML and handle line breaks)
     */
    formatMessageForDisplay(value) {
        return this.escapeForHtml(value).replace(/\r?\n/g, '<br>')
    }

    /**
     * Escape HTML characters
     */
    escapeForHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
    }

    /**
     * Clean up event listeners and resources
     */
    destroy() {
        // Remove context menu if it exists
        const existingMenu = document.querySelector('.log-context-menu')
        if (existingMenu) {
            existingMenu.remove()
        }
    }
}
