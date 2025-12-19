/**
 * SquadRoster UI Component
 * Displays connected players and squad management functionality
 */
export class SquadRoster {
    constructor(containerId, options = {}) {
        this.containerId = containerId
        this.options = {
            onRefreshPeers: options.onRefreshPeers || (() => {}),
            onPingAllPeers: options.onPingAllPeers || (() => {}),
            onLeaveRoom: options.onLeaveRoom || (() => {}),
            ...options
        }
        this.element = null
        this.squadMembers = []
        this.isVisible = false
    }

    /**
     * Initialize the SquadRoster component
     */
    init() {
        this.element = document.getElementById(this.containerId)
        if (!this.element) {
            throw new Error(`SquadRoster container with id "${this.containerId}" not found`)
        }
        
        this.render()
        this.attachEventListeners()
        return this
    }

    /**
     * Render the SquadRoster HTML structure
     */
    render() {
        this.element.innerHTML = `
            <div class="control-section" id="tile-connected-players" style="display: none;">
                <h3>Squad Roster</h3>
                <p class="section-hint">Keep your allies in formation and ready for descent.</p>
                
                <div class="button-row subtle-actions">
                    <button class="btn danger" id="leave-room-btn">Leave Room</button>
                </div>
                
                <!-- Enhanced Squad Roster with Chat Integration -->
                <div class="squad-roster-container" role="region" aria-labelledby="squad-title" aria-describedby="squad-description">
                    <div class="squad-header">
                        <div class="squad-title" id="squad-title">
                            <span class="squad-icon" aria-hidden="true">⚔️</span>
                            <span class="squad-name">Active Squad</span>
                            <span class="squad-count" id="squad-count" aria-label="Squad member count">0/8</span>
                        </div>
                        <div class="squad-actions" role="toolbar" aria-label="Squad management actions">
                            <button class="btn-icon" id="refresh-peers-btn" title="Refresh Squad" aria-label="Refresh squad roster" type="button">
                                <span class="icon-refresh" aria-hidden="true">🔄</span>
                            </button>
                            <button class="btn-icon" id="ping-all-btn" title="Ping All" aria-label="Ping all squad members" type="button">
                                <span class="icon-ping" aria-hidden="true">📡</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="squad-members" id="squad-members" role="list" aria-label="Squad members list">
                        <div class="squad-member empty" role="listitem" aria-label="No squad members connected">
                            <div class="member-avatar" aria-hidden="true">👤</div>
                            <div class="member-info">
                                <div class="member-name">No allies connected</div>
                                <div class="member-status">Awaiting reinforcements</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
    }

    /**
     * Attach event listeners to the SquadRoster component
     */
    attachEventListeners() {
        // Leave room button
        const leaveRoomBtn = this.element.querySelector('#leave-room-btn')
        if (leaveRoomBtn) {
            leaveRoomBtn.addEventListener('click', () => {
                this.options.onLeaveRoom()
            })
        }

        // Refresh peers button
        const refreshPeersBtn = this.element.querySelector('#refresh-peers-btn')
        if (refreshPeersBtn) {
            refreshPeersBtn.addEventListener('click', () => {
                this.options.onRefreshPeers()
            })
        }

        // Ping all peers button
        const pingAllBtn = this.element.querySelector('#ping-all-btn')
        if (pingAllBtn) {
            pingAllBtn.addEventListener('click', () => {
                this.options.onPingAllPeers()
            })
        }
    }

    /**
     * Update the squad roster with current members
     */
    updateSquadRoster(squadData) {
        const {
            peers = {},
            currentPeerName = 'Unknown',
            isInRoom = false,
            peerNames = new Map()
        } = squadData

        const squadMembers = this.element.querySelector('#squad-members')
        const squadCount = this.element.querySelector('#squad-count')
        
        if (!squadMembers || !squadCount) {return}

        const peersArray = Object.keys(peers)
        const totalMembers = peersArray.length + (isInRoom ? 1 : 0)

        // Update squad count
        squadCount.textContent = `${totalMembers}/8`

        if (peersArray.length === 0 && !isInRoom) {
            squadMembers.innerHTML = `
                <div class="squad-member empty">
                    <div class="member-avatar">👤</div>
                    <div class="member-info">
                        <div class="member-name">No allies connected</div>
                        <div class="member-status">Awaiting reinforcements</div>
                    </div>
                </div>
            `
        } else {
            let membersHTML = ''

            // Add current player first
            if (isInRoom && currentPeerName) {
                membersHTML += `
                    <div class="squad-member self" role="listitem" aria-label="Squad leader: ${currentPeerName}">
                        <div class="member-avatar" aria-hidden="true">👑</div>
                        <div class="member-info">
                            <div class="member-name">${currentPeerName} (You)</div>
                            <div class="member-status">Squad Leader</div>
                        </div>
                    </div>
                `
            }

            // Add other squad members
            peersArray.forEach(peerId => {
                const shortId = peerId.substring(0, 4)
                let peerName = peerNames.get(peerId)
                
                // If we don't have the peer name yet, show a temporary name
                if (!peerName) {
                    peerName = `Ally ${shortId}`
                }
                
                const status = this.getPeerStatus(peerId)
                
                membersHTML += `
                    <div class="squad-member" role="listitem" aria-label="Squad member: ${peerName}, status: ${status}">
                        <div class="member-avatar" aria-hidden="true">⚔️</div>
                        <div class="member-info">
                            <div class="member-name">${peerName}</div>
                            <div class="member-status">${status}</div>
                        </div>
                    </div>
                `
            })

            squadMembers.innerHTML = membersHTML
        }

        this.squadMembers = squadData
    }

    /**
     * Get a random status for a peer
     */
    getPeerStatus(_peerId) {
        const statuses = [
            'Ready for battle',
            'Standing by',
            'Combat ready',
            'Awaiting orders',
            'In position'
        ]
        return statuses[Math.floor(Math.random() * statuses.length)]
    }

    /**
     * Show/hide the entire SquadRoster component
     */
    setVisible(visible) {
        this.isVisible = visible
        const connectedPlayersTile = this.element.querySelector('#tile-connected-players')
        if (connectedPlayersTile) {
            connectedPlayersTile.style.display = visible ? '' : 'none'
        }
    }

    /**
     * Add a new squad member
     */
    addSquadMember(peerId, peerName, isSelf = false) {
        const squadMembers = this.element.querySelector('#squad-members')
        if (!squadMembers) {return}

        const status = this.getPeerStatus(peerId)
        const avatar = isSelf ? '👑' : '⚔️'
        const nameDisplay = isSelf ? `${peerName} (You)` : peerName
        const statusDisplay = isSelf ? 'Squad Leader' : status
        const memberClass = isSelf ? 'self' : ''

        const memberElement = document.createElement('div')
        memberElement.className = `squad-member ${memberClass}`
        memberElement.setAttribute('role', 'listitem')
        memberElement.setAttribute('aria-label', `Squad member: ${peerName}, status: ${statusDisplay}`)
        memberElement.innerHTML = `
            <div class="member-avatar" aria-hidden="true">${avatar}</div>
            <div class="member-info">
                <div class="member-name">${nameDisplay}</div>
                <div class="member-status">${statusDisplay}</div>
            </div>
        `

        // Add with animation
        memberElement.style.opacity = '0'
        memberElement.style.transform = 'translateY(-10px)'
        squadMembers.appendChild(memberElement)
        
        // Animate in
        setTimeout(() => {
            memberElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
            memberElement.style.opacity = '1'
            memberElement.style.transform = 'translateY(0)'
        }, 10)

        this.updateSquadCount()
    }

    /**
     * Remove a squad member
     */
    removeSquadMember(peerId) {
        const squadMembers = this.element.querySelector('#squad-members')
        if (!squadMembers) {return}

        const memberElements = squadMembers.querySelectorAll('.squad-member')
        memberElements.forEach(member => {
            const nameElement = member.querySelector('.member-name')
            if (nameElement && nameElement.textContent.includes(peerId.substring(0, 4))) {
                // Animate out
                member.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
                member.style.opacity = '0'
                member.style.transform = 'translateY(-10px)'
                
                setTimeout(() => {
                    member.remove()
                    this.updateSquadCount()
                }, 300)
            }
        })
    }

    /**
     * Update the squad count display
     */
    updateSquadCount() {
        const squadCount = this.element.querySelector('#squad-count')
        if (!squadCount) {return}

        const memberElements = this.element.querySelectorAll('.squad-member:not(.empty)')
        const count = memberElements.length
        squadCount.textContent = `${count}/8`
    }

    /**
     * Highlight a squad member (for ping responses, etc.)
     */
    highlightMember(peerId, duration = 2000) {
        const squadMembers = this.element.querySelector('#squad-members')
        if (!squadMembers) {return}

        const memberElements = squadMembers.querySelectorAll('.squad-member')
        memberElements.forEach(member => {
            const nameElement = member.querySelector('.member-name')
            if (nameElement && nameElement.textContent.includes(peerId.substring(0, 4))) {
                member.classList.add('highlighted')
                setTimeout(() => {
                    member.classList.remove('highlighted')
                }, duration)
            }
        })
    }

    /**
     * Get current squad data
     */
    getCurrentSquadData() {
        return { ...this.squadMembers }
    }

    /**
     * Clean up event listeners and resources
     */
    destroy() {
        // Remove event listeners if needed
        // This component uses minimal event handling, so cleanup is minimal
    }
}
