import { SaveLoadManager } from '../src/game/save-load-manager.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

class MockWasmExports {
  constructor() {
    this.memory = { buffer: new ArrayBuffer(65536) };
    this.version = 1;
    this.savePointer = 0;
    this.statsPointer = 4096;
    this.nextMalloc = 8192;
    this.saveSize = 0;
    this.autoSaveReady = false;
    this.currentState = this.createDefaultState();
  }

  createDefaultState() {
    return {
      hero: {
        name: 'Demo Survivor',
        health: 100,
        stamina: 100
      },
      stats: {
        level: 1,
        gold: 0,
        essence: 0,
        roomCount: 1,
        totalPlayTime: 0,
        phase: 0
      },
      inventory: ['Rusty Blade', 'Explorer Cloak'],
      notes: 'Fresh run started.'
    };
  }

  setState(partial) {
    const nextStats = {
      ...(this.currentState.stats || {}),
      ...(partial.stats || {})
    };

    this.currentState = {
      ...this.currentState,
      ...partial,
      stats: nextStats
    };
  }

  getState() {
    return this.currentState;
  }

  create_save_data() {
    const payload = JSON.stringify(this.currentState);
    const bytes = encoder.encode(payload);
    const memory = new Uint8Array(this.memory.buffer);
    memory.fill(0, this.savePointer, this.savePointer + bytes.length + 1);
    memory.set(bytes, this.savePointer);
    this.saveSize = bytes.length;
    return this.savePointer;
  }

  get_save_data_size() {
    return this.saveSize;
  }

  get_save_statistics() {
    const stats = this.currentState.stats || {};
    const payload = JSON.stringify({
      level: stats.level ?? 1,
      gold: stats.gold ?? 0,
      essence: stats.essence ?? 0,
      roomCount: stats.roomCount ?? 1,
      totalPlayTime: stats.totalPlayTime ?? 0,
      phase: stats.phase ?? 0
    });
    const bytes = encoder.encode(payload + '\0');
    const memory = new Uint8Array(this.memory.buffer);
    memory.fill(0, this.statsPointer, this.statsPointer + bytes.length + 1);
    memory.set(bytes, this.statsPointer);
    return this.statsPointer;
  }

  get_save_version() {
    return this.version;
  }

  load_save_data(ptr, length) {
    const memory = new Uint8Array(this.memory.buffer);
    const slice = memory.slice(ptr, ptr + length);
    try {
      const decoded = decoder.decode(slice);
      this.currentState = JSON.parse(decoded);
      return 1;
    } catch (err) {
      console.error('Mock load failed', err);
      return 0;
    }
  }

  malloc(size) {
    const ptr = this.nextMalloc;
    this.nextMalloc += size;
    if (this.nextMalloc > this.memory.buffer.byteLength) {
      this.nextMalloc = ptr;
    }
    return ptr;
  }

  free(_ptr) {
    // No-op for the demo allocator
  }

  auto_save_check() {
    if (this.autoSaveReady) {
      this.autoSaveReady = false;
      return 1;
    }
    return 0;
  }

  requestAutoSave() {
    this.autoSaveReady = true;
  }
}

class MockWasmManager {
  constructor() {
    this.isLoaded = true;
    this.exports = new MockWasmExports();
  }

  setState(partial) {
    this.exports.setState(partial);
  }

  getState() {
    return this.exports.getState();
  }

  requestAutoSave() {
    this.exports.requestAutoSave();
  }
}

const form = document.getElementById('state-form');
const preview = document.getElementById('state-preview');
const logList = document.getElementById('log-list');
const autoSaveStatus = document.getElementById('auto-save-status');
const autoSaveMeta = document.getElementById('auto-save-meta');

const inputRefs = {
  heroName: document.getElementById('input-hero-name'),
  level: document.getElementById('input-level'),
  gold: document.getElementById('input-gold'),
  essence: document.getElementById('input-essence'),
  roomCount: document.getElementById('input-room-count'),
  playtime: document.getElementById('input-playtime'),
  phase: document.getElementById('input-phase'),
  loadout: document.getElementById('input-loadout'),
  notes: document.getElementById('input-notes')
};

const quickSaveBtn = document.getElementById('quick-save');
const quickLoadBtn = document.getElementById('quick-load');
const triggerAutoSaveBtn = document.getElementById('trigger-auto-save');
const loadAutoSaveBtn = document.getElementById('load-auto-save');
const clearStorageBtn = document.getElementById('clear-storage');

const wasmManager = new MockWasmManager();
const saveManager = new SaveLoadManager(wasmManager);
saveManager.stopAutoSave();
saveManager.autoSaveEnabled = false;

function getStatsFromInputs() {
  return {
    level: Number(inputRefs.level.value) || 1,
    gold: Number(inputRefs.gold.value) || 0,
    essence: Number(inputRefs.essence.value) || 0,
    roomCount: Number(inputRefs.roomCount.value) || 1,
    totalPlayTime: Math.max(0, Math.round(Number(inputRefs.playtime.value) || 0) * 60),
    phase: Number(inputRefs.phase.value) || 0
  };
}

function parseInventory(value) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function updateMockStateFromInputs() {
  const stats = getStatsFromInputs();
  wasmManager.setState({
    hero: {
      ...(wasmManager.getState().hero || {}),
      name: inputRefs.heroName.value.trim() || 'Demo Survivor'
    },
    stats,
    inventory: parseInventory(inputRefs.loadout.value),
    notes: inputRefs.notes.value.trim()
  });
  renderStatePreview();
}

function applyStateToInputs(state) {
  const stats = state.stats || {};
  inputRefs.heroName.value = state.hero?.name ?? 'Demo Survivor';
  inputRefs.level.value = stats.level ?? 1;
  inputRefs.gold.value = stats.gold ?? 0;
  inputRefs.essence.value = stats.essence ?? 0;
  inputRefs.roomCount.value = stats.roomCount ?? 1;
  inputRefs.playtime.value = Math.round((stats.totalPlayTime ?? 0) / 60);
  inputRefs.phase.value = String(stats.phase ?? 0);
  inputRefs.loadout.value = (state.inventory || []).join(', ');
  inputRefs.notes.value = state.notes ?? '';
}

function renderStatePreview() {
  preview.textContent = JSON.stringify(wasmManager.getState(), null, 2);
}

function logMessage(message, type = 'info') {
  const item = document.createElement('li');
  item.dataset.type = type;
  const timestamp = new Date().toLocaleTimeString();
  item.textContent = `[${timestamp}] ${message}`;
  logList.prepend(item);
  while (logList.children.length > 20) {
    logList.removeChild(logList.lastChild);
  }
}

function renderSlots() {
  for (let i = 0; i < 3; i++) {
    const statusEl = document.getElementById(`slot-${i}-status`);
    const metaEl = document.getElementById(`slot-${i}-meta`);
    const meta = saveManager.saveMetadata.get(i);
    const loadBtn = document.querySelector(`button[data-action="load"][data-slot="${i}"]`);
    const deleteBtn = document.querySelector(`button[data-action="delete"][data-slot="${i}"]`);

    if (meta) {
      const { timestamp, stats } = meta;
      const summary = [
        `<span class="label">Saved:</span> ${new Date(timestamp).toLocaleString()}`,
        `<span class="label">Level:</span> ${stats.level}`,
        `<span class="label">Gold:</span> ${stats.gold}`,
        `<span class="label">Essence:</span> ${stats.essence}`,
        `<span class="label">Phase:</span> ${saveManager.getPhaseName(stats.phase)}`
      ];
      statusEl.textContent = 'Saved';
      metaEl.innerHTML = summary.map(line => `<p>${line}</p>`).join('');
      loadBtn.disabled = false;
      deleteBtn.disabled = false;
    } else {
      statusEl.textContent = 'Empty';
      metaEl.innerHTML = '<p class="empty">No data saved.</p>';
      loadBtn.disabled = true;
      deleteBtn.disabled = true;
    }
  }
}

function renderAutoSaveInfo() {
  const raw = localStorage.getItem('game_auto_save');
  const rawTime = localStorage.getItem('game_auto_save_time');

  if (raw && rawTime) {
    const savedAt = new Date(Number(rawTime));
    autoSaveStatus.textContent = 'Available';
    autoSaveMeta.innerHTML = `<p><span class="label">Saved:</span> ${savedAt.toLocaleString()}</p><p><span class="label">Size:</span> ${Math.round(raw.length * 0.75)} bytes</p>`;
    loadAutoSaveBtn.disabled = false;
  } else {
    autoSaveStatus.textContent = 'No data';
    autoSaveMeta.innerHTML = 'Auto save snapshots are written to <code>localStorage</code> with the <code>game_auto_save</code> key.';
    loadAutoSaveBtn.disabled = true;
  }
}

async function handleSave(slot) {
  updateMockStateFromInputs();
  const success = await saveManager.saveGame(slot);
  if (success) {
    logMessage(`Saved slot ${slot + 1}`, 'success');
    renderSlots();
  } else {
    logMessage(`Save failed for slot ${slot + 1}`, 'error');
  }
}

async function handleLoad(slot) {
  const success = await saveManager.loadGame(slot);
  if (success) {
    logMessage(`Loaded slot ${slot + 1}`, 'success');
    applyStateToInputs(wasmManager.getState());
    renderStatePreview();
  } else {
    logMessage(`No save present in slot ${slot + 1}`, 'warn');
  }
}

function handleDelete(slot) {
  saveManager.deleteSave(slot);
  logMessage(`Deleted slot ${slot + 1}`, 'warn');
  renderSlots();
}

async function handleQuickSave() {
  updateMockStateFromInputs();
  const success = await saveManager.quickSave();
  if (success) {
    logMessage('Quick save updated slot 1', 'success');
    renderSlots();
  }
}

async function handleQuickLoad() {
  const success = await saveManager.quickLoad();
  if (success) {
    logMessage('Quick load restored slot 1', 'success');
    applyStateToInputs(wasmManager.getState());
    renderStatePreview();
  }
}

async function handleAutoSave() {
  updateMockStateFromInputs();
  wasmManager.requestAutoSave();
  saveManager.autoSaveEnabled = true;
  const success = await saveManager.autoSave();
  saveManager.autoSaveEnabled = false;
  if (success) {
    logMessage('Auto save snapshot created', 'info');
    renderAutoSaveInfo();
  } else {
    logMessage('Auto save did not run (mock said no changes)', 'warn');
  }
}

async function handleAutoSaveLoad() {
  const success = await saveManager.loadAutoSave();
  if (success) {
    logMessage('Auto save slot loaded', 'success');
    applyStateToInputs(wasmManager.getState());
    renderStatePreview();
  } else {
    logMessage('Auto save slot is empty', 'warn');
  }
}

function handleClearStorage() {
  saveManager.saveMetadata.clear();
  localStorage.removeItem('game_auto_save');
  localStorage.removeItem('game_auto_save_time');
  for (let i = 0; i < 3; i++) {
    localStorage.removeItem(`game_save_slot_${i}`);
    localStorage.removeItem(`game_save_slot_${i}_meta`);
  }
  renderSlots();
  renderAutoSaveInfo();
  logMessage('Cleared all save data from local storage', 'warn');
}

form.addEventListener('input', () => {
  updateMockStateFromInputs();
});

document.getElementById('randomize-state').addEventListener('click', () => {
  inputRefs.level.value = Math.floor(Math.random() * 30) + 1;
  inputRefs.gold.value = Math.floor(Math.random() * 500);
  inputRefs.essence.value = Math.floor(Math.random() * 120);
  inputRefs.roomCount.value = Math.floor(Math.random() * 12) + 1;
  inputRefs.playtime.value = Math.floor(Math.random() * 180);
  inputRefs.phase.value = String(Math.floor(Math.random() * 8));
  inputRefs.loadout.value = ['Scout Cloak', 'Solar Blade', 'Warden Totem', 'Rescue Drone']
    .sort(() => 0.5 - Math.random())
    .slice(0, 2)
    .join(', ');
  inputRefs.notes.value = 'Auto generated demo stats';
  updateMockStateFromInputs();
  logMessage('Randomized mock state');
});

document.getElementById('reset-state').addEventListener('click', () => {
  wasmManager.exports = new MockWasmExports();
  saveManager.stopAutoSave();
  saveManager.autoSaveEnabled = false;
  applyStateToInputs(wasmManager.getState());
  renderStatePreview();
  renderAutoSaveInfo();
  logMessage('Reset mock state to defaults');
});

document.getElementById('write-state').addEventListener('click', () => {
  updateMockStateFromInputs();
  logMessage('Mock state updated from form', 'info');
});

quickSaveBtn.addEventListener('click', handleQuickSave);
quickLoadBtn.addEventListener('click', handleQuickLoad);
triggerAutoSaveBtn.addEventListener('click', handleAutoSave);
loadAutoSaveBtn.addEventListener('click', handleAutoSaveLoad);
clearStorageBtn.addEventListener('click', handleClearStorage);

document.querySelectorAll('.slot-actions button').forEach(button => {
  const slot = Number(button.dataset.slot);
  const action = button.dataset.action;
  if (action === 'save') {
    button.addEventListener('click', () => {
      handleSave(slot);
    });
  }
  if (action === 'load') {
    button.addEventListener('click', () => {
      handleLoad(slot);
    });
  }
  if (action === 'delete') {
    button.addEventListener('click', () => {
      handleDelete(slot);
    });
  }
});

window.addEventListener('gameSaved', event => {
  const index = event.detail?.slotIndex ?? 0;
  logMessage(`SaveLoadManager reported save event for slot ${index + 1}`, 'info');
});

window.addEventListener('gameLoaded', event => {
  const index = event.detail?.slotIndex ?? 0;
  logMessage(`SaveLoadManager reported load event for slot ${index + 1}`, 'info');
});

window.addEventListener('saveDeleted', event => {
  const index = event.detail?.slotIndex ?? 0;
  logMessage(`SaveLoadManager reported delete event for slot ${index + 1}`, 'warn');
});

window.addEventListener('notification', event => {
  const detail = event.detail || {};
  logMessage(detail.message || 'Notification', detail.type || 'info');
});

applyStateToInputs(wasmManager.getState());
renderStatePreview();
renderSlots();
renderAutoSaveInfo();
logMessage('Feature demo ready. Try saving to a slot to see metadata updates.', 'success');
