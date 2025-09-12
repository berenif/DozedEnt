## Input Flags (Bitmask Specification)

Canonical bit assignments for the 5-button combat system and movement integration. Keep documentation in sync with WASM headers and JS input plumbing.

### Bit assignments
```text
bit 0 (0x0001): INPUT_LIGHT_ATTACK  // A1
bit 1 (0x0002): INPUT_HEAVY_ATTACK  // A2
bit 2 (0x0004): INPUT_BLOCK         // Hold=guard, Tap=parry
bit 3 (0x0008): INPUT_ROLL          // Dodge with i-frames
bit 4 (0x0010): INPUT_SPECIAL       // Hero-specific move

Optional movement packing (if used as flags):
bit 5 (0x0020): INPUT_MOVE_LEFT
bit 6 (0x0040): INPUT_MOVE_RIGHT
bit 7 (0x0080): INPUT_MOVE_UP
bit 8 (0x0100): INPUT_MOVE_DOWN
```

### Guiding rules
- JS gathers inputs but does not decide outcomes. All logic executes in WASM.
- Use an input buffer of 120ms for action consumption (see `INPUT_BUFFER_TIME` in WASM).
- Favor flat numeric flags over objects for deterministic sync and serialization.

### WASM integration
Export a function to process packed flags and delta time. Example signature:
```cpp
extern "C" void process_character_input(uint32_t id, uint32_t input_flags, float dt);
```

### JS integration
Generate flags from the current input state before forwarding to WASM:
```javascript
let flags = 0;
if (input.lightAttack) flags |= 0x0001;
if (input.heavyAttack) flags |= 0x0002;
if (input.block)       flags |= 0x0004;
if (input.roll)        flags |= 0x0008;
if (input.special)     flags |= 0x0010;
```

Last updated: September 2025

