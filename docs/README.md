# 🎮 DozedEnt - Live Demo

[![Deploy Status](https://github.com/YOUR_USERNAME/DozedEnt/workflows/Deploy%20to%20GitHub%20Pages/badge.svg)](https://github.com/YOUR_USERNAME/DozedEnt/actions)
[![Game Status](https://img.shields.io/badge/status-playable-brightgreen)](https://YOUR_USERNAME.github.io/DozedEnt/)

**🚀 [Play Now](https://YOUR_USERNAME.github.io/DozedEnt/) | 📖 [Documentation](../GUIDELINES/README.md) | 🐛 [Report Issues](https://github.com/YOUR_USERNAME/DozedEnt/issues)**

---

## 🌟 About This Demo

This is the live deployment of **DozedEnt**, a cutting-edge WebAssembly-first multiplayer survival game featuring:

### ⚡ Core Features
- **🎯 5-Button Combat System** - Responsive fighting with light/heavy attacks, blocking, rolling, and special moves
- **🧠 Advanced AI** - Intelligent wolf pack behavior with coordinated hunting strategies  
- **🎮 8-Phase Game Loop** - Complete roguelike progression system
- **🌐 P2P Multiplayer** - Serverless networking with Trystero
- **📱 Mobile-Optimized** - Touch controls with haptic feedback
- **🎨 Procedural Animation** - Dynamic wolf body physics and environmental effects

### 🏗️ Technical Highlights
- **WebAssembly Core** - All game logic runs at native speed in WASM
- **Deterministic Gameplay** - Same inputs = same results across all clients
- **Performance Optimized** - <16ms frame times, <32MB memory usage
- **Modern Architecture** - Clean separation between game logic and presentation

---

## 🎯 How to Play

### 🖥️ Desktop Controls
- **WASD** - Move your character
- **J** - Light Attack (fast, low damage)
- **K** - Heavy Attack (slow, high damage, can be feinted)
- **Shift** - Block/Parry (hold to guard, tap for perfect parry)
- **Space/Ctrl** - Dodge Roll (invincibility frames)
- **L** - Special Attack (weapon-dependent abilities)

### 📱 Mobile Controls
- **Left Joystick** - Movement
- **Action Buttons** - All combat abilities with visual feedback
- **Interface Switcher** - Toggle between different UI layouts

---

## 🔄 Game Phases Explained

| Phase | Name | Description |
|-------|------|-------------|
| 0️⃣ | **Explore** | Navigate rooms, avoid hazards, manage stamina |
| 1️⃣ | **Fight** | Combat encounters with intelligent wolf packs |
| 2️⃣ | **Choose** | Select upgrades: Safe, Spicy, or Weird options |
| 3️⃣ | **PowerUp** | Apply chosen effects to character stats |
| 4️⃣ | **Risk** | Push-your-luck mechanics with curse system |
| 5️⃣ | **Escalate** | Ramping difficulty with elite enemies |
| 6️⃣ | **CashOut** | Shop for upgrades using dual currency |
| 7️⃣ | **Reset** | Clean restart with progression bonuses |

---

## 🌐 Multiplayer Features

### 🏟️ Lobby System
- **Room Creation** - Host games with custom settings
- **Matchmaking** - Quick join available rooms
- **Chat System** - Communicate with other players
- **Analytics Dashboard** - Real-time game statistics

### 🔗 P2P Networking
- **Multiple Backends** - Firebase, IPFS, MQTT, Supabase, BitTorrent
- **Host Migration** - Seamless leadership transitions
- **Rollback Netcode** - Smooth gameplay despite network latency
- **Desync Detection** - Automatic error recovery

---

## 🛠️ Technical Architecture

### 📦 File Structure
```
docs/
├── index.html          # Main game page
├── js/
│   ├── site.js         # Main game controller
│   └── src/            # Source modules
│       ├── css/        # Stylesheets
│       ├── wasm/       # WebAssembly integration
│       ├── netcode/    # Networking modules
│       ├── animation/  # Animation systems
│       ├── ai/         # Enemy AI
│       └── utils/      # Utilities
├── wasm/
│   └── game.wasm      # WebAssembly game engine
├── assets/
│   └── audio/         # Sound effects and music
└── _config.yml        # Jekyll configuration
```

### ⚙️ Build Process
1. **WASM Compilation** - C++ game logic compiled to WebAssembly
2. **Asset Processing** - Audio and visual assets optimized
3. **Module Bundling** - JavaScript modules packaged with Rollup
4. **GitHub Actions** - Automated testing and deployment

---

## 🧪 Development Status

### ✅ Completed Features
- [x] Complete 5-button combat system
- [x] 8-phase core game loop
- [x] Advanced wolf AI with pack behavior
- [x] P2P multiplayer networking
- [x] Mobile touch controls
- [x] Performance optimization
- [x] Deterministic gameplay
- [x] Audio system integration

### 🚧 In Development
- [ ] Additional weapon types
- [ ] Boss encounters
- [ ] Character progression system
- [ ] Achievement system
- [ ] Replay system
- [ ] Spectator mode

### 📊 Performance Metrics
- **Frame Rate**: 60+ FPS on modern devices
- **Memory Usage**: <32MB total WASM memory
- **Load Time**: <3 seconds on broadband
- **Network Latency**: <100ms P2P synchronization

---

## 🐛 Known Issues & Limitations

### 🔧 Current Limitations
- WebAssembly requires modern browser support
- Some mobile browsers may have audio latency
- P2P connections may require firewall configuration

### 🚀 Planned Improvements
- Progressive Web App (PWA) support
- Offline mode capabilities
- Enhanced mobile performance
- Additional networking backends

---

## 📚 Documentation Links

- **🏗️ [Architecture Guide](../GUIDELINES/AGENTS.md)** - WASM-first development principles
- **⚔️ [Combat System](../GUIDELINES/5-BUTTON_COMBAT_IMPLEMENTATION.md)** - Detailed fighting mechanics
- **🤖 [AI Documentation](../GUIDELINES/AI/)** - Enemy behavior systems
- **🎬 [Animation System](../GUIDELINES/ANIMATION/)** - Procedural animation framework
- **🌐 [Multiplayer Guide](../GUIDELINES/MULTIPLAYER/)** - Networking architecture
- **🛠️ [Build Instructions](../GUIDELINES/UTILS/BUILD_INSTRUCTIONS.md)** - Development setup

---

## 🤝 Contributing

This is a live demo of the DozedEnt game framework. For development contributions:

1. **Fork the Repository** - Create your own copy
2. **Read the Guidelines** - Check [GUIDELINES/README.md](../GUIDELINES/README.md)
3. **Follow Architecture** - Maintain WASM-first principles
4. **Test Thoroughly** - Ensure deterministic behavior
5. **Submit Pull Request** - Include detailed description

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Emscripten** - WebAssembly compilation toolchain
- **Trystero** - Serverless WebRTC matchmaking
- **GitHub Pages** - Free hosting for open source projects
- **Community Contributors** - Bug reports and feature suggestions

---

*Last updated: January 2025 | Game Version: 0.21.8*
