# 🗺️ Player Ability Upgrade - Visual Roadmap

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     PLAYER ABILITY UPGRADE SYSTEM                        │
│                          8-Week Implementation                           │
└─────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: CHARACTER-SPECIFIC ABILITIES (Weeks 1-3)                        │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Week 1: 🛡️ WARDEN SHOULDER BASH                                         │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │ Day 1-2: WASM Core Implementation                                 │    │
│  │  • ShoulderBashState struct                                       │    │
│  │  • charge_bash() / release_bash() methods                        │    │
│  │  • Physics impulse integration                                    │    │
│  │  • WASM exports                                                   │    │
│  ├──────────────────────────────────────────────────────────────────┤    │
│  │ Day 3-4: JavaScript Integration                                   │    │
│  │  • WardenAbilities class                                          │    │
│  │  • Charge particle effects                                        │    │
│  │  • Impact shockwave VFX                                          │    │
│  │  • Camera shake integration                                       │    │
│  ├──────────────────────────────────────────────────────────────────┤    │
│  │ Day 5: Testing & Polish                                           │    │
│  │  • Demo page creation                                             │    │
│  │  • Balance tuning                                                 │    │
│  │  • Bug fixes                                                      │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  Week 2: ⚔️ RAIDER BERSERKER CHARGE                                      │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │ Day 1-2: WASM Core Implementation                                 │    │
│  │  • BerserkerChargeState struct                                    │    │
│  │  • Hyperarmor system                                              │    │
│  │  • Damage reduction mechanics                                     │    │
│  │  • Velocity maintenance                                           │    │
│  ├──────────────────────────────────────────────────────────────────┤    │
│  │ Day 3-4: JavaScript Integration                                   │    │
│  │  • RaiderAbilities class                                          │    │
│  │  • Berserk aura effect                                            │    │
│  │  • Speed line particles                                           │    │
│  │  • Healing on kill VFX                                           │    │
│  ├──────────────────────────────────────────────────────────────────┤    │
│  │ Day 5: Testing & Polish                                           │    │
│  │  • Demo page creation                                             │    │
│  │  • Duration/damage tuning                                         │    │
│  │  • Bug fixes                                                      │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  Week 3: 🗡️ KENSEI FLOW DASH                                             │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │ Day 1-2: WASM Core Implementation                                 │    │
│  │  • FlowDashState struct                                           │    │
│  │  • Instant teleport mechanic                                      │    │
│  │  • Combo chain tracking                                           │    │
│  │  • Multi-dash targeting                                           │    │
│  ├──────────────────────────────────────────────────────────────────┤    │
│  │ Day 3-4: JavaScript Integration                                   │    │
│  │  • KenseiAbilities class                                          │    │
│  │  • Motion blur trails                                             │    │
│  │  • Afterimage effects                                             │    │
│  │  • Dash slash VFX                                                │    │
│  ├──────────────────────────────────────────────────────────────────┤    │
│  │ Day 5: Testing & Polish                                           │    │
│  │  • Demo page creation                                             │    │
│  │  • Combo window tuning                                            │    │
│  │  • Bug fixes                                                      │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  ✅ Deliverable: 3 fully functional character abilities                   │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: ABILITY PROGRESSION SYSTEM (Weeks 4-5)                          │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Week 4: 💎 UPGRADE INFRASTRUCTURE                                        │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │ • AbilityUpgradeSystem.h/cpp                                      │    │
│  │ • Essence currency system                                         │    │
│  │ • Upgrade tree data structures                                    │    │
│  │ • Purchase validation logic                                       │    │
│  │ • Save/load persistence                                           │    │
│  │ • WASM exports for upgrades                                       │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  Week 5: 🎨 UPGRADE UI                                                    │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │ • Upgrade menu UI (ability-upgrade-menu.js)                       │    │
│  │ • Upgrade tree visualization                                      │    │
│  │ • Purchase flow & confirmation                                    │    │
│  │ • Essence display & tooltips                                      │    │
│  │ • Purchase animations                                             │    │
│  │ • Integration with game loop                                      │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  ✅ Deliverable: Working progression system with UI                       │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: ADVANCED COMBAT MECHANICS (Weeks 6-7)                           │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Week 6: 🔗 COMBO SYSTEM                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │ • ComboSystem.cpp implementation                                  │    │
│  │ • Combo tree data structures                                      │    │
│  │ • Input buffering for combos                                      │    │
│  │ • Damage scaling calculations                                     │    │
│  │ • Combo UI indicators                                             │    │
│  │ • Branching combo paths                                           │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  Week 7: ⚡ CANCEL SYSTEM                                                 │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │ • Cancel window definitions                                       │    │
│  │ • Cancel validation logic                                         │    │
│  │ • Stamina costs for cancels                                       │    │
│  │ • Cancel animations                                               │    │
│  │ • Ability-specific cancels                                        │    │
│  │ • Cancel UI feedback                                              │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  ✅ Deliverable: Deep combat mechanics for skilled players                │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: POLISH & OPTIMIZATION (Week 8)                                  │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Week 8: ✨ VISUAL & AUDIO POLISH                                         │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │ Day 1-2: Visual Effects Enhancement                               │    │
│  │  • Particle system polish                                         │    │
│  │  • Enhanced shockwaves & trails                                   │    │
│  │  • Color grading for abilities                                    │    │
│  │                                                                    │    │
│  │ Day 3-4: Camera & Sound                                           │    │
│  │  • Camera shake/zoom polish                                       │    │
│  │  • Motion blur implementation                                     │    │
│  │  • Time dilation effects                                          │    │
│  │  • Complete sound design                                          │    │
│  │                                                                    │    │
│  │ Day 5: Optimization & Testing                                     │    │
│  │  • Performance profiling                                          │    │
│  │  • Mobile optimization                                            │    │
│  │  • Final balance pass                                             │    │
│  │  • Bug fixes & polish                                             │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  ✅ Deliverable: Production-ready ability system                          │
└───────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         FINAL DELIVERABLES                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  🛡️ Warden Shoulder Bash      ⚔️ Raider Berserker Charge              │
│     • Charged knockback           • Unstoppable rush                    │
│     • Stun on impact              • Hyperarmor                          │
│     • Stamina refund              • Damage reduction                    │
│     • 4-tier upgrades             • Heal on kill                        │
│                                   • 4-tier upgrades                     │
│                                                                          │
│  🗡️ Kensei Flow Dash         💎 Progression System                     │
│     • Multi-target dash           • Essence currency                    │
│     • Combo chains                • Upgrade trees                       │
│     • I-frames                    • Save/load system                    │
│     • Stamina refund              • Purchase UI                         │
│     • 4-tier upgrades                                                   │
│                                                                          │
│  🔗 Combo System              ⚡ Cancel System                          │
│     • Branching paths             • Attack cancels                      │
│     • Damage scaling              • Ability cancels                     │
│     • Input buffering             • Skill expression                    │
│     • Visual feedback                                                   │
│                                                                          │
│  ✨ Polish & VFX              🎮 Complete Integration                   │
│     • Particle effects            • WASM-first architecture             │
│     • Camera effects              • Physics integration                 │
│     • Sound design                • Animation system                    │
│     • Motion blur                 • Multiplayer-ready                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        SUCCESS METRICS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Performance:                      Gameplay:                            │
│  ✅ 60 FPS @ all times             ✅ Characters feel distinct          │
│  ✅ < 60KB WASM size               ✅ Abilities are satisfying          │
│  ✅ < 2ms VFX overhead             ✅ Progression provides goals        │
│  ✅ No memory leaks                ✅ Combos increase depth             │
│                                    ✅ Balance is fair                   │
│                                                                          │
│  Technical:                        Quality:                             │
│  ✅ All logic in WASM              ✅ Professional polish               │
│  ✅ Deterministic execution        ✅ Clear visual feedback             │
│  ✅ Multiplayer sync works         ✅ Responsive controls               │
│  ✅ Clean architecture             ✅ Engaging sound design             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    GETTING STARTED                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  📚 Documentation:                                                       │
│     1. PLAYER_ABILITY_SUMMARY.md (overview)                             │
│     2. PLAYER_ABILITY_UPGRADE_PLAN.md (full technical plan)             │
│     3. PLAYER_ABILITY_QUICK_START.md (day-by-day guide)                 │
│                                                                          │
│  🚀 Quick Start:                                                         │
│     1. Read the summary (you're here!)                                  │
│     2. Review Week 1 in Quick Start guide                               │
│     3. Set up dev environment                                           │
│     4. Start with Day 1: WASM core                                      │
│     5. Follow checklist day by day                                      │
│                                                                          │
│  🎯 Recommended Path:                                                    │
│     • Start with Warden bash (simplest)                                 │
│     • Get it working end-to-end                                         │
│     • Polish before moving to next ability                              │
│     • Add progression after all 3 abilities work                        │
│     • Implement advanced mechanics last                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         TIME ESTIMATES                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Phase 1: Character Abilities        120 hours (3 weeks × 40h)          │
│     └─ Week 1: Warden bash            40 hours                          │
│     └─ Week 2: Raider charge          40 hours                          │
│     └─ Week 3: Kensei dash            40 hours                          │
│                                                                          │
│  Phase 2: Progression System          80 hours (2 weeks × 40h)          │
│     └─ Week 4: Backend                 40 hours                         │
│     └─ Week 5: UI                      40 hours                         │
│                                                                          │
│  Phase 3: Advanced Mechanics          80 hours (2 weeks × 40h)          │
│     └─ Week 6: Combos                  40 hours                         │
│     └─ Week 7: Cancels                 40 hours                         │
│                                                                          │
│  Phase 4: Polish                       40 hours (1 week × 40h)          │
│     └─ Week 8: VFX/Audio/Optimize      40 hours                         │
│                                                                          │
│  TOTAL:                              320 hours (8 weeks × 40h)          │
│                                                                          │
│  Parallel Development (2 devs):      160 hours (4 weeks)                │
│  Accelerated (3 devs):               107 hours (2.7 weeks)              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Dependency Graph

```
┌────────────────────────────────────────────────────────────────────┐
│                     IMPLEMENTATION DEPENDENCIES                     │
└────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │  Warden Bash │ ◄─── Start here (simplest ability)
    └──────┬───────┘
           │
           ├──────────────────────────┐
           ↓                          ↓
    ┌──────────────┐          ┌─────────────┐
    │ Raider Charge│          │ Kensei Dash │
    └──────┬───────┘          └──────┬──────┘
           │                         │
           └───────────┬─────────────┘
                       ↓
            ┌──────────────────────┐
            │ Progression System   │ ◄─── Requires all 3 abilities
            └──────────┬───────────┘
                       │
                       ├────────────────────┐
                       ↓                    ↓
            ┌──────────────┐    ┌───────────────────┐
            │ Combo System │    │  Cancel System    │
            └──────┬───────┘    └────────┬──────────┘
                   │                     │
                   └──────────┬──────────┘
                              ↓
                   ┌──────────────────┐
                   │  Polish & VFX    │ ◄─── Final integration
                   └──────────────────┘
```

---

## 🎓 Learning Path

For developers new to the codebase:

1. **Week 0** (Optional): Study existing systems
   - Review 5-button combat implementation
   - Understand WASM-first architecture
   - Explore physics integration
   - Test current game build

2. **Week 1**: Learn by doing (Warden bash)
   - Follow quick-start guide closely
   - Ask questions when stuck
   - Test frequently
   - Document learnings

3. **Weeks 2-3**: Build on knowledge
   - Apply patterns from Week 1
   - Experiment with variations
   - Optimize as you go

4. **Weeks 4+**: Advanced features
   - Design systems architecture
   - Consider edge cases
   - Think about scalability

---

**Status**: ✅ **PLANNING COMPLETE**  
**Next Action**: Open [Quick Start Guide](./PLAYER_ABILITY_QUICK_START.md)  
**Support**: Reference [Full Plan](./PLAYER_ABILITY_UPGRADE_PLAN.md) for details

