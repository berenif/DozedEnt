# -*- coding: utf-8 -*-
path = Path('public/index.html')
text = path.read_text(encoding='utf-8')

css_insert = """
    .combat-controls {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .combat-controls .control-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: center;
    }

    .combat-button {
      flex: 1 1 140px;
      min-width: 140px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(30, 64, 175, 0.25));
      color: #f8fafc;
      padding: 12px 16px;
      border-radius: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
      display: flex;
      flex-direction: column;
      gap: 6px;
      align-items: center;
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    }

    .combat-button strong {
      font-size: 0.95rem;
      letter-spacing: 0.04em;
    }

    .combat-button span {
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #94a3b8;
    }

    .combat-button:focus-visible {
      outline: 2px solid rgba(56, 189, 248, 0.6);
      outline-offset: 2px;
    }

    .combat-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 30px rgba(2, 6, 23, 0.45);
    }

    .combat-button.is-active {
      border-color: rgba(96, 165, 250, 0.9);
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.55), rgba(79, 70, 229, 0.65));
      box-shadow: 0 18px 40px rgba(37, 99, 235, 0.35);
    }

    .combat-telemetry {
      margin-top: 28px;
      display: grid;
      gap: 18px;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }

    .telemetry-card {
      padding: 20px;
      border-radius: 16px;
      background: rgba(15, 23, 42, 0.78);
      border: 1px solid rgba(148, 163, 184, 0.18);
      box-shadow: 0 12px 32px rgba(2, 6, 23, 0.45);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .telemetry-card h3 {
      margin: 0;
      font-size: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #bfdbfe;
    }

    .telemetry-list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 8px;
    }

    .telemetry-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 0.9rem;
      color: #cbd5f5;
    }

    .telemetry-label {
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .telemetry-value {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }

    .telemetry-value.is-alert {
      color: #f87171;
    }

    .telemetry-value.is-ready {
      color: #34d399;
    }

    .status-effect-controls {
      margin-top: 24px;
      padding: 20px;
      border-radius: 16px;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(59, 130, 246, 0.2);
      box-shadow: 0 12px 28px rgba(2, 6, 23, 0.4);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .status-effect-controls h3 {
      margin: 0;
      font-size: 0.95rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #a5b4fc;
    }

    .status-effect-controls p {
      margin: 0;
      font-size: 0.85rem;
      color: #94a3b8;
    }

    .status-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .status-button {
      flex: 1 1 160px;
      min-width: 140px;
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      background: rgba(30, 64, 175, 0.2);
      color: #e2e8f0;
      padding: 10px 14px;
      font-size: 0.85rem;
      letter-spacing: 0.04em;
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    }

    .status-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 24px rgba(2, 6, 23, 0.35);
    }

    .status-button:focus-visible {
      outline: 2px solid rgba(129, 140, 248, 0.6);
      outline-offset: 2px;
    }

    .combat-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(59, 130, 246, 0.16);
      color: #bfdbfe;
      font-size: 0.75rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    @media (max-width: 720px) {
      .combat-controls .control-row {
        justify-content: stretch;
      }

      .combat-button {
        flex-basis: calc(50% - 12px);
      }

      .status-button {
        flex-basis: calc(50% - 12px);
      }
    }

    @media (max-width: 480px) {
      .combat-button {
        flex-basis: 100%;
      }

      .status-button {
        flex-basis: 100%;
      }
    }
"""

if 'combat-controls' not in text:
    text = text.replace('  </style>', css_insert + '\n\n  </style>')

old_block = """      <div class=\"game-info\" data-game-info>\n        <span>Status: <strong data-game-status>Idle</strong></span>\n        <span>Position: <strong data-game-coords>0, 0</strong></span>\n        <button type=\"button\" class=\"game-info-button\" data-center-player>Center Player</button>\n      </div>\n    </section>"""

new_markup = """      <div class=\"game-info\" data-game-info>\n        <span>Status: <strong data-game-status>Idle</strong></span>\n        <span>Position: <strong data-game-coords>0, 0</strong></span>\n        <button type=\"button\" class=\"game-info-button\" data-center-player>Center Player</button>\n      </div>\n      <div class=\"combat-controls\" data-combat-controls>\n        <div class=\"control-row\">\n          <button type=\"button\" class=\"combat-button\" data-combat-button=\"light\">\n            <strong>Light Attack</strong>\n            <span>J / 1</span>\n          </button>\n          <button type=\"button\" class=\"combat-button\" data-combat-button=\"heavy\">\n            <strong>Heavy Attack</strong>\n            <span>K / 2</span>\n          </button>\n          <button type=\"button\" class=\"combat-button\" data-combat-button=\"special\">\n            <strong>Special</strong>\n            <span>L / 5</span>\n          </button>\n        </div>\n        <div class=\"control-row\">\n          <button type=\"button\" class=\"combat-button\" data-combat-button=\"block\" data-holdable=\"true\">\n            <strong>Block / Parry</strong>\n            <span>Shift / 3</span>\n          </button>\n          <button type=\"button\" class=\"combat-button\" data-combat-button=\"roll\">\n            <strong>Roll</strong>\n            <span>Ctrl / 4</span>\n          </button>\n          <button type=\"button\" class=\"combat-button\" data-combat-button=\"parry\">\n            <strong>Parry Counter</strong>\n            <span>During Block</span>\n          </button>\n        </div>\n      </div>\n      <div class=\"combat-telemetry\" data-combat-telemetry>\n        <article class=\"telemetry-card\">\n          <h3>Attack &amp; Flow</h3>\n          <ul class=\"telemetry-list\">\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">Attack State</span><span class=\"telemetry-value\" data-attack-state>Offline</span></li>\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">State Timer</span><span class=\"telemetry-value\" data-attack-timer>0.00s</span></li>\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">Combo Count</span><span class=\"telemetry-value\" data-combo-count>0</span></li>\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">Combo Window</span><span class=\"telemetry-value\" data-combo-window>—</span></li>\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">Counter Ready</span><span class=\"telemetry-value\" data-counter-ready>No</span></li>\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">Counter Window</span><span class=\"telemetry-value\" data-counter-window>—</span></li>\n          </ul>\n        </article>\n        <article class=\"telemetry-card\">\n          <h3>Defense &amp; Mobility</h3>\n          <ul class=\"telemetry-list\">\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">Blocking</span><span class=\"telemetry-value\" data-block-state>No</span></li>\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">Hyperarmor</span><span class=\"telemetry-value\" data-hyperarmor>No</span></li>\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">Armor Value</span><span class=\"telemetry-value\" data-armor-value>0</span></li>\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">Roll State</span><span class=\"telemetry-value\" data-roll-state>Idle</span></li>\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">Roll Timer</span><span class=\"telemetry-value\" data-roll-timer>0.00s</span></li>\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">Stunned</span><span class=\"telemetry-value\" data-stun-state>No</span></li>\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">Stun Remaining</span><span class=\"telemetry-value\" data-stun-remaining>0.00s</span></li>\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">Speed</span><span class=\"telemetry-value\" data-speed>0.00</span></li>\n          </ul>\n        </article>\n        <article class=\"telemetry-card\">\n          <h3>Status &amp; Environment</h3>\n          <ul class=\"telemetry-list\">\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">Active Effects</span><span class=\"telemetry-value\" data-status-count>0</span></li>\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">Move Modifier</span><span class=\"telemetry-value\" data-status-move>1.00×</span></li>\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">Damage Modifier</span><span class=\"telemetry-value\" data-status-damage>1.00×</span></li>\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">Defense Modifier</span><span class=\"telemetry-value\" data-status-defense>1.00×</span></li>\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">Near Wall</span><span class=\"telemetry-value\" data-wall-state>No</span></li>\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">Wall Distance</span><span class=\"telemetry-value\" data-wall-distance>—</span></li>\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">Near Ledge</span><span class=\"telemetry-value\" data-ledge-state>No</span></li>\n            <li class=\"telemetry-row\"><span class=\"telemetry-label\">Ledge Distance</span><span class=\"telemetry-value\" data-ledge-distance>—</span></li>\n          </ul>\n        </article>\n      </div>\n      <div class=\"status-effect-controls\">\n        <h3>Status Effect Sandbox</h3>\n        <p>Send quick status effect samples to the WASM combat layer and watch the telemetry respond. Everything uses the live exports outlined in GUIDELINES/FIGHT.</p>\n        <div class=\"status-buttons\">\n          <button type=\"button\" class=\"status-button\" data-status-action=\"burning\">Apply Burning</button>\n          <button type=\"button\" class=\"status-button\" data-status-action=\"stun\">Apply Stun</button>\n          <button type=\"button\" class=\"status-button\" data-status-action=\"slow\">Apply Slow</button>\n          <button type=\"button\" class=\"status-button\" data-status-action=\"boost\">Apply Damage Boost</button>\n          <button type=\"button\" class=\"status-button\" data-status-action=\"clear\">Clear Demo Effects</button>\n        </div>\n      </div>\n    </section>"""

if old_block in text:
    text = text.replace(old_block, new_markup)
else:
    raise SystemExit('Could not locate combat insertion point')

path.write_text(text, encoding='utf-8')
