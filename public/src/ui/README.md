# UI System Refactoring

This directory contains the refactored UI system for the DozedEnt multiplayer demo, extracted from the monolithic `working-multiplayer-demo.html` file into modular, reusable components.

## Architecture

The UI system is now organized into:

### Components (`/components/`)
- **RoomForge** - Room creation, joining, and discovery functionality
- **SignalStatus** - Network connection status and player information display
- **SquadRoster** - Connected players and squad management
- **ChatIntegration** - Squad chat functionality and message display
- **LogPanel** - Expedition log and event messages

### Manager (`/`)
- **MultiplayerDemoUI** - Main coordinator that manages all components and handles state

## Usage

### Basic Setup
```javascript
import { MultiplayerDemoUI } from './src/ui/multiplayer-demo-ui.js'

const ui = new MultiplayerDemoUI({
    onRoomCreate: createRoom,
    onRoomJoin: joinRoom,
    onRoomLeave: leaveRoom,
    // ... other event handlers
})

await ui.init()
```

### Component Access
```javascript
// Get individual components
const roomForge = ui.getComponent('roomForge')
const chatIntegration = ui.getComponent('chatIntegration')

// Update component state
ui.updateRoomStatus(roomId, isInRoom, isHostingRoom)
ui.updatePeerList(peers, peerNames)
ui.addChatMessage(sender, message, isSystem, isSelf)
```

## File Structure

```
src/ui/
├── components/
│   ├── index.js              # Component exports
│   ├── room-forge.js         # Room management UI
│   ├── signal-status.js      # Connection status UI
│   ├── squad-roster.js       # Player roster UI
│   ├── chat-integration.js   # Chat functionality UI
│   └── log-panel.js          # Event logging UI
├── multiplayer-demo-ui.js    # Main UI manager
└── README.md                 # This file
```

## Benefits

1. **Modularity** - Each component handles a specific UI concern
2. **Reusability** - Components can be used independently or in other contexts
3. **Maintainability** - Easier to debug and modify individual features
4. **Testability** - Components can be unit tested in isolation
5. **Separation of Concerns** - UI logic separated from business logic

## Migration

The original `working-multiplayer-demo.html` has been refactored into:
- `demos/working-multiplayer-demo-refactored.html` - Uses the new UI system
- All functionality preserved with improved organization

## Component API

Each component follows a consistent pattern:

```javascript
class ComponentName {
    constructor(containerId, options)
    init()                    // Initialize component
    render()                  // Render HTML structure
    attachEventListeners()    // Set up event handling
    updateState(data)         // Update component state
    destroy()                 // Cleanup resources
}
```

## Event Handling

Components communicate with the main application through callback functions passed in the options object. This maintains loose coupling while allowing for flexible event handling.

## Styling

The refactored system uses the same CSS files as the original:
- `src/css/common.css`
- `src/css/working-multiplayer-demo.css`

All existing styles are preserved and work with the new component structure.
