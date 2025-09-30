# 🚀 Multiplayer Quick Start Guide

## Getting Started in 60 Seconds

### 1. Access Multiplayer

Open your browser and navigate to:
```
public/index.html
```

Click the **"Multiplayer"** button on the main menu.

### 2. Create or Join a Room

**Option A: Create a Room**
1. Click **"Create Room"**
2. Enter room name (e.g., "My Game")
3. Choose settings (defaults are fine)
4. Click **"Create"**

**Option B: Join Existing Room**
1. Browse available rooms
2. Click on a room to join

**Option C: Quick Play**
1. Click **"Quick Play"**
2. Automatically joins or creates a room

### 3. Ready Up and Play

1. Wait for other players to join
2. Click **"Ready"** when ready
3. Game starts automatically when all players are ready
4. Enjoy synchronized multiplayer combat!

## Testing Locally

### Solo Testing (Preview)

1. Open `public/multiplayer.html` in your browser
2. Create a room
3. Explore the lobby interface
4. Note: You'll need another player to actually start a game

### Multi-Window Testing

1. **Window 1**: Open `public/multiplayer.html`
   - Create a room
   - Note the room name

2. **Window 2**: Open `public/multiplayer.html` in another window
   - Join the room you created
   - Click "Ready"

3. **Both Windows**: Click "Ready"
   - Game should start in both windows
   - Test synchronized gameplay

**Tips for Multi-Window Testing:**
- Use different browser profiles, OR
- Use incognito/private mode in second window, OR
- Use two different browsers (Chrome + Firefox)

## Key Features to Try

### Room Management
- ✅ Create rooms with different names
- ✅ Choose different game modes (Default, Deathmatch, Team Battle, Survival)
- ✅ Set different player limits (2-8 players)
- ✅ Try public vs private rooms

### Player Features
- ✅ Change your player name in the sidebar
- ✅ See your player stats (rating, games played)
- ✅ View other players joining/leaving in real-time

### Network Features
- ✅ Watch the network quality indicator (top-left during game)
- ✅ See connection status change colors (green/yellow/red)
- ✅ Status messages appear for all actions (top-right)

### Game Features
- ✅ Use keyboard controls (WASD + mouse clicks)
- ✅ Try mobile controls on touch devices
- ✅ Return to lobby after game
- ✅ Create new rooms or join different ones

## Controls

### Desktop
- **WASD**: Move
- **Left Click**: Light Attack
- **Right Click**: Heavy Attack
- **Space**: Block
- **Shift**: Roll
- **E**: Special Attack

### Mobile
- **Virtual Joystick**: Move (left side)
- **Action Buttons**: Combat moves (right side)

## Troubleshooting

### Can't See Rooms
- Click "Refresh" button
- Try "Quick Play" to auto-create a room
- Check browser console for errors

### Can't Join Room
- Room may be full
- Room may have started already
- Try creating your own room

### Game Won't Start
- Ensure all players clicked "Ready"
- Check if host is still connected
- Return to lobby and try again

### Network Issues
- Check your internet connection
- Look at network indicator (should be green)
- Try refreshing the page

## Debug Console

Open browser console (F12) and try:

```javascript
// View multiplayer coordinator
window.multiplayer

// Check current state
window.multiplayer.state

// View room manager
window.multiplayer.roomManager

// Get all rooms
Array.from(window.multiplayer.roomManager.rooms.values())

// Check network status
window.multiplayer.multiplayerSync?.getSystemStatus()
```

## What to Expect

### Lobby Experience
- Clean, dark-themed interface
- Real-time room list updates
- Smooth animations and transitions
- Clear status messages
- Network quality indicators

### Game Experience
- Synchronized gameplay across clients
- Host authority for game state
- Rollback netcode for smooth play
- Automatic desync recovery
- Quality-based network optimization

## Performance Tips

### For Best Experience
- ✅ Use stable internet connection
- ✅ Keep browser tab in focus
- ✅ Close unnecessary browser tabs
- ✅ Use modern browser (Chrome, Firefox, Edge, Safari)
- ✅ Enable hardware acceleration

### Network Requirements
- **Minimum**: 1 Mbps up/down
- **Recommended**: 5+ Mbps up/down
- **Latency**: < 100ms for best experience
- **Connection**: Wired recommended, WiFi acceptable

## Next Steps

### For Players
1. Invite friends to play
2. Try different game modes
3. Experiment with combat strategies
4. Track your stats and rating

### For Developers
1. Read `MULTIPLAYER_IMPLEMENTATION.md` for details
2. Explore the code in `public/src/multiplayer/`
3. Check existing netcode in `public/src/netcode/`
4. Review guidelines in `GUIDELINES/MULTIPLAYER/`

## Support

### Common Questions

**Q: Do I need a server?**
A: No! It's fully peer-to-peer (P2P).

**Q: How many players can play?**
A: 2-8 players per room (configurable).

**Q: Does it work on mobile?**
A: Yes! Responsive design with touch controls.

**Q: Can I play with friends on other networks?**
A: Yes, as long as you can connect via WebRTC.

**Q: What if the host leaves?**
A: Host automatically migrates to another player.

### Getting Help

1. Check browser console for errors (F12)
2. Review `MULTIPLAYER_IMPLEMENTATION.md`
3. Check guidelines in `GUIDELINES/MULTIPLAYER/`
4. Use debug tools (see Debug Console above)

## Have Fun!

🎮 Enjoy the multiplayer combat experience!

The system supports:
- ✅ Real-time synchronization
- ✅ Smooth rollback netcode
- ✅ Automatic recovery
- ✅ Host migration
- ✅ Network optimization
- ✅ Beautiful UI
- ✅ Mobile support

**Ready to battle? Click "Multiplayer" and jump in!**