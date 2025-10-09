import { GUIDELINE_FEATURES } from './guidelines-data.js';

const STORAGE_KEY = 'dozed.guideline.demo.v1';

const normalizedFeatures = GUIDELINE_FEATURES.map((raw, index) => {
  const path = (raw.path || '').replace(/\\/g, '/');
  const categoryRaw = (raw.category || 'ROOT').replace(/\\/g, '/');
  const segments = categoryRaw.split('/').filter(Boolean);
  const majorCategory = segments[0] || 'ROOT';
  const subCategory = segments.slice(1).map(formatName).join(' / ') || null;
  const title = formatName(raw.name);
  return {
    id: `${categoryRaw}::${raw.name}::${index}`,
    rawName: raw.name,
    title,
    path,
    categoryPath: categoryRaw,
    majorCategory,
    subCategory,
    searchText: `${title} ${raw.name} ${categoryRaw} ${path}`.toLowerCase()
  };
});

const categoryCounts = normalizedFeatures.reduce((acc, feature) => {
  acc[feature.majorCategory] = (acc[feature.majorCategory] || 0) + 1;
  return acc;
}, {});

const orderedMajors = Array.from(new Set(normalizedFeatures.map((feature) => feature.majorCategory))).sort((a, b) => {
  if (a === 'ROOT') return -1;
  if (b === 'ROOT') return 1;
  return a.localeCompare(b);
});

let inputDebugActive = false;

// Event listener cleanup tracking
const eventListeners = [];

function addEventListenerWithCleanup(target, event, handler, options) {
  target.addEventListener(event, handler, options);
  eventListeners.push({ target, event, handler, options });
}

function cleanupEventListeners() {
  eventListeners.forEach(({ target, event, handler, options }) => {
    target.removeEventListener(event, handler, options);
  });
  eventListeners.length = 0;
}

const ACTIONS = [
  {
    id: 'spawn-pack',
    label: 'Spawn Wolf Pack',
    description: 'Calls spawn_wolves WASM export to bring wolves into the arena.',
    categories: ['AI', 'PROGRESS/WOLF'],
    run: async () => {
      const dz = await needDZ();
      const exports = dz.optional?.spawn_wolves || dz.exports?.spawn_wolves;
      if (typeof exports === 'function') {
        exports(5);
        return 'spawn_wolves(5) executed.';
      }
      const spawnOne = dz.exports?.spawn_wolf;
      if (typeof spawnOne === 'function') {
        const px = dz.exports?.get_x?.() ?? 0.5;
        const py = dz.exports?.get_y?.() ?? 0.5;
        const dist = 0.18;
        for (let i = 0; i < 5; i += 1) {
          const angle = (i / 5) * Math.PI * 2;
          spawnOne(px + Math.cos(angle) * dist, py + Math.sin(angle) * dist, i % 4);
        }
        return 'spawn_wolf(...) executed five times.';
      }
      throw new Error('No wolf spawning exports available in this build.');
    }
  },
  {
    id: 'warden-bash',
    label: 'Trigger Warden Bash',
    description: 'Forces the Warden bash ability to show combat animation and VFX.',
    categories: ['FIGHT', 'ANIMATION', 'PROGRESS/playerl'],
    run: async () => {
      const dz = await needDZ();
      const abilityManager = dz.abilityManager;
      const handler = abilityManager?.getAbilityHandler?.();
      if (!handler?.startCharging || !handler?.releaseBash) {
        throw new Error('Bash ability not available. Start the game and ensure WASM exports are up to date.');
      }
      handler.startCharging();
      await wait(650);
      handler.releaseBash();
      return 'Warden bash ability executed.';
    }
  },
  {
    id: 'reset-run',
    label: 'Reset Simulation Run',
    description: 'Resets the deterministic WASM simulation and replays initialization.',
    categories: ['GAME', 'PROGRESS'],
    run: async () => {
      const dz = await needDZ();
      if (typeof dz.reset !== 'function') {
        throw new Error('Reset export not available in this build.');
      }
      dz.reset();
      return 'Simulation reset using current deterministic seed.';
    }
  },
  {
    id: 'toggle-input-debug',
    label: 'Toggle Input Debug Overlay',
    description: 'Enables or disables the unified input debug tooling from the UI guidelines.',
    categories: ['UI', 'SYSTEMS', 'UTILS'],
    run: async () => {
      const dz = await needDZ();
      const manager = dz.inputManager;
      if (!manager?.setDebugMode) {
        throw new Error('Input manager not ready. Start the game first.');
      }
      inputDebugActive = !inputDebugActive;
      manager.setDebugMode(inputDebugActive);
      if (inputDebugActive) {
        dz.enableInputDebug?.();
      } else {
        dz.disableInputDebug?.();
      }
      return inputDebugActive ? 'Unified input debug enabled.' : 'Unified input debug disabled.';
    }
  },
  {
    id: 'open-multiplayer',
    label: 'Open Multiplayer Lobby',
    description: 'Opens the multiplayer lobby demo in a new tab to showcase netcode guidelines.',
    categories: ['MULTIPLAYER'],
    run: async () => {
      const opened = window.open('multiplayer.html', '_blank', 'noopener');
      if (!opened) {
        throw new Error('Popup blocked. Allow popups for this site.');
      }
      return 'Multiplayer lobby opened in a new tab.';
    }
  },
  {
    id: 'copy-feature-list',
    label: 'Copy Full Feature List',
    description: 'Copies every guideline spec path to the clipboard for quick reference.',
    categories: ['ROOT', 'BUILD'],
    run: async () => {
      const lines = normalizedFeatures.map((feature) => `[${formatCategoryLabel(feature.majorCategory)}] ${feature.title} � ${feature.path}`);
      const ok = await tryCopy(lines.join('\n'));
      if (!ok) {
        throw new Error('Clipboard permissions denied.');
      }
      return 'Guideline feature list copied to clipboard.';
    }
  },
  {
    id: 'enumerate-wasm',
    label: 'Enumerate WASM Exports',
    description: 'Logs available WASM exports and optional handles from the current build.',
    categories: ['WASM', 'UTILS'],
    run: async () => {
      const dz = await needDZ();
      const exports = dz.exports ? Object.keys(dz.exports).sort() : [];
      const optional = dz.optional ? Object.keys(dz.optional).sort() : [];
      console.group('[DozedEnt] WASM exports');
      console.table(exports.slice(0, 25));
      if (exports.length > 25) {
        console.log(`... and ${exports.length - 25} more`);
      }
      console.groupEnd();
      console.group('[DozedEnt] Optional handles');
      console.table(optional);
      console.groupEnd();
      return `Found ${exports.length} core exports and ${optional.length} optional handles.`;
    }
  },
  {
    id: 'open-skeleton-demo',
    label: 'Open Skeleton Physics Demo',
    description: 'Launches the interactive skeleton physics demo from the guidelines.',
    categories: ['SKELETON', 'ANIMATION'],
    run: async () => {
      const opened = window.open('demos/skeleton/interactive-skeleton-physics.html', '_blank', 'noopener');
      if (!opened) {
        throw new Error('Popup blocked. Allow popups for this site.');
      }
      return 'Skeleton physics demo opened in a new tab.';
    }
  },
  {
    id: 'log-past-choices',
    label: 'Summarize Past Choices',
    description: 'Console logs the recorded migration notes from the past choices guidelines.',
    categories: ['PAST CHOICES'],
    run: async () => {
      const notes = normalizedFeatures.filter((feature) => feature.categoryPath.startsWith('PAST CHOICES'));
      console.group('[DozedEnt] Past choices references');
      notes.forEach((feature) => console.log(`${feature.title}: ${feature.path}`));
      console.groupEnd();
      if (!notes.length) {
        return 'No past choice documents found.';
      }
      return `Logged ${notes.length} past choice references to the console.`;
    }
  },
  {
    id: 'log-system-flags',
    label: 'Inspect Runtime Flags',
    description: 'Dumps the current deterministic runtime flags to highlight systems and progress tracking.',
    categories: ['SYSTEMS', 'PROGRESS'],
    run: async () => {
      const dz = await needDZ();
      if (typeof dz.flags !== 'function') {
        throw new Error('Runtime flags unavailable.');
      }
      const flags = dz.flags();
      console.group('[DozedEnt] Runtime flags');
      console.log(flags);
      console.groupEnd();
      return 'Runtime flags dumped to console for inspection.';
    }
  }
];

export function initGuidelineShowcase(options = {}) {
  if (typeof document === 'undefined') {
    return;
  }

  const containerId = options.containerId || 'guideline-panel-root';
  const host = document.getElementById(containerId);
  if (!host || host.dataset.initialized === 'true') {
    return;
  }
  host.dataset.initialized = 'true';

  const state = loadState();

  const markup = `
    <div class="guideline-showcase">
      <button type="button" class="guideline-launcher" data-role="launcher">
        <span class="guideline-launcher__dot"></span>
        <span class="guideline-launcher__label">Guideline Demo</span>
        <span class="guideline-launcher__progress" data-role="launcher-progress"></span>
      </button>
      <section class="guideline-panel guideline-hidden" data-role="panel" aria-hidden="true" tabindex="-1">
        <div class="guideline-panel__header">
          <div>
            <h2>Guideline Feature Demo</h2>
            <p>Every spec from the /GUIDELINES folder is listed below. Trigger live actions to exercise the systems.</p>
          </div>
          <button type="button" class="guideline-panel__close" data-role="close" aria-label="Close guideline demo">&times;</button>
        </div>
        <div class="guideline-panel__body">
          <aside class="guideline-panel__sidebar">
            <div class="guideline-sidebar-section">
              <h3>Categories</h3>
              <div class="guideline-category-list" data-role="category-list"></div>
            </div>
            <div class="guideline-sidebar-section">
              <h3>Live Actions</h3>
              <div class="guideline-action-list" data-role="action-list"></div>
            </div>
            <div class="guideline-action-log" data-role="action-log" aria-live="polite"></div>
          </aside>
          <main class="guideline-panel__main">
            <div class="guideline-controls">
              <input type="search" data-role="search" placeholder="Search features�" autocomplete="off" aria-label="Search features">
              <select data-role="status-filter" aria-label="Filter by implementation status">
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="complete">Demoed</option>
              </select>
              <button type="button" data-role="mark-all">Mark All Demoed</button>
              <button type="button" data-role="reset-progress">Reset Progress</button>
            </div>
            <div class="guideline-progress" data-role="progress"></div>
            <div class="guideline-feature-list" data-role="feature-list"></div>
          </main>
        </div>
      </section>
    </div>
  `;

  host.innerHTML = markup;

  const panel = host.querySelector('[data-role="panel"]');
  const launcher = host.querySelector('[data-role="launcher"]');
  const closeBtn = host.querySelector('[data-role="close"]');
  const searchInput = host.querySelector('[data-role="search"]');
  const statusSelect = host.querySelector('[data-role="status-filter"]');
  const markAllBtn = host.querySelector('[data-role="mark-all"]');
  const resetBtn = host.querySelector('[data-role="reset-progress"]');
  const progressEl = host.querySelector('[data-role="progress"]');
  const featureList = host.querySelector('[data-role="feature-list"]');
  const actionList = host.querySelector('[data-role="action-list"]');
  const categoryList = host.querySelector('[data-role="category-list"]');
  const actionLog = host.querySelector('[data-role="action-log"]');
  const launcherProgress = host.querySelector('[data-role="launcher-progress"]');

  let activeCategory = 'ALL';
  let searchTerm = '';
  let statusFilter = 'all';

  const categoryButtons = new Map();

  const allCategories = [
    { key: 'ALL', label: `All (${normalizedFeatures.length})` },
    ...orderedMajors.map((key) => ({
      key,
      label: `${formatCategoryLabel(key)} (${categoryCounts[key] || 0})`
    }))
  ];

  buildCategoryButtons();
  renderActions();
  renderFeatures();
  updateProgress();

  addEventListenerWithCleanup(launcher, 'click', () => {
    if (panel.classList.contains('guideline-hidden')) {
      openPanel();
    } else {
      closePanel();
    }
  });

  addEventListenerWithCleanup(closeBtn, 'click', () => closePanel());

  addEventListenerWithCleanup(document, 'keydown', (event) => {
    if (event.key === 'Escape' && !panel.classList.contains('guideline-hidden')) {
      closePanel();
    }
  });

  addEventListenerWithCleanup(searchInput, 'input', (event) => {
    searchTerm = event.target.value.trim().toLowerCase();
    renderFeatures();
  });

  addEventListenerWithCleanup(statusSelect, 'change', (event) => {
    statusFilter = event.target.value;
    renderFeatures();
  });

  addEventListenerWithCleanup(markAllBtn, 'click', () => {
    normalizedFeatures.forEach((feature) => {
      state.completed[feature.id] = true;
    });
    saveState(state);
    renderFeatures();
    updateProgress();
    showActionMessage('success', 'Marked every guideline as demoed.');
  });

  addEventListenerWithCleanup(resetBtn, 'click', () => {
    state.completed = {};
    saveState(state);
    renderFeatures();
    updateProgress();
    showActionMessage('info', 'Guideline progress reset.');
  });

  addEventListenerWithCleanup(featureList, 'click', async (event) => {
    const button = event.target.closest('button');
    if (!button) {
      return;
    }
    const card = button.closest('.guideline-card');
    if (!card) {
      return;
    }
    const feature = normalizedFeatures.find((item) => item.id === card.dataset.featureId);
    if (!feature) {
      return;
    }
    const action = button.dataset.action;
    if (action === 'mark') {
      const done = !isComplete(feature);
      setFeatureStatus(feature.id, done);
      showActionMessage(done ? 'success' : 'info', `${feature.title} marked as ${done ? 'demoed' : 'pending'}.`);
    } else if (action === 'copy') {
      const ok = await tryCopy(feature.path);
      showActionMessage(ok ? 'success' : 'error', ok ? 'Feature path copied to clipboard.' : 'Clipboard copy unavailable in this context.');
    }
  });

  function openPanel() {
    panel.classList.remove('guideline-hidden');
    panel.setAttribute('aria-hidden', 'false');
    setTimeout(() => {
      searchInput?.focus({ preventScroll: true });
    }, 60);
  }

  function closePanel() {
    panel.classList.add('guideline-hidden');
    panel.setAttribute('aria-hidden', 'true');
  }

  function buildCategoryButtons() {
    categoryList.innerHTML = '';
    categoryButtons.clear();
    allCategories.forEach(({ key, label }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'guideline-category-button';
      button.dataset.category = key;
      button.textContent = label;
      if (key === activeCategory) {
        button.classList.add('is-active');
      }
      addEventListenerWithCleanup(button, 'click', () => {
        if (activeCategory === key) {
          return;
        }
        activeCategory = key;
        updateCategoryButtons();
        renderFeatures();
      });
      categoryButtons.set(key, button);
      categoryList.appendChild(button);
    });
  }

  function updateCategoryButtons() {
    categoryButtons.forEach((button, key) => {
      if (key === activeCategory) {
        button.classList.add('is-active');
      } else {
        button.classList.remove('is-active');
      }
    });
  }

  function renderActions() {
    actionList.innerHTML = '';
    ACTIONS.forEach((action) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'guideline-action';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'guideline-action__button';
      button.textContent = action.label;
      addEventListenerWithCleanup(button, 'click', () => executeAction(action));
      wrapper.appendChild(button);

      if (Array.isArray(action.categories) && action.categories.length) {
        const badges = document.createElement('div');
        badges.className = 'guideline-action__badges';
        action.categories.forEach((category) => {
          const badge = document.createElement('span');
          badge.className = 'guideline-badge';
          badge.textContent = formatCategoryLabel(category);
          badges.appendChild(badge);
        });
        wrapper.appendChild(badges);
      }

      const description = document.createElement('p');
      description.className = 'guideline-action__description';
      description.textContent = action.description;
      wrapper.appendChild(description);

      actionList.appendChild(wrapper);
    });
  }

  function renderFeatures() {
    const filtered = normalizedFeatures.filter((feature) => {
      if (activeCategory !== 'ALL' && feature.majorCategory !== normalizeCategory(activeCategory)) {
        return false;
      }
      if (statusFilter === 'pending' && isComplete(feature)) {
        return false;
      }
      if (statusFilter === 'complete' && !isComplete(feature)) {
        return false;
      }
      if (searchTerm && !feature.searchText.includes(searchTerm)) {
        return false;
      }
      return true;
    });

    featureList.innerHTML = '';
    if (!filtered.length) {
      const empty = document.createElement('p');
      empty.className = 'guideline-empty';
      empty.textContent = 'No features matched the current filters.';
      featureList.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    filtered.forEach((feature) => {
      const card = document.createElement('article');
      card.className = 'guideline-card';
      card.dataset.featureId = feature.id;
      if (isComplete(feature)) {
        card.classList.add('is-complete');
      }

      const title = document.createElement('h4');
      title.className = 'guideline-card__title';
      title.textContent = feature.title;
      card.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 'guideline-card__meta';

      const badge = document.createElement('span');
      badge.className = 'guideline-badge';
      badge.textContent = formatCategoryLabel(feature.majorCategory);
      meta.appendChild(badge);

      if (feature.subCategory) {
        const sub = document.createElement('span');
        sub.className = 'guideline-card__subcategory';
        sub.textContent = feature.subCategory;
        meta.appendChild(sub);
      }

      card.appendChild(meta);

      const path = document.createElement('div');
      path.className = 'guideline-card__path';
      path.textContent = feature.path;
      card.appendChild(path);

      const actionsRow = document.createElement('div');
      actionsRow.className = 'guideline-card__actions';

      const markBtn = document.createElement('button');
      markBtn.type = 'button';
      markBtn.className = 'guideline-card__button';
      markBtn.dataset.action = 'mark';
      markBtn.textContent = isComplete(feature) ? 'Mark Pending' : 'Mark Demoed';
      actionsRow.appendChild(markBtn);

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'guideline-card__button';
      copyBtn.dataset.action = 'copy';
      copyBtn.textContent = 'Copy Path';
      actionsRow.appendChild(copyBtn);

      card.appendChild(actionsRow);

      fragment.appendChild(card);
    });

    featureList.appendChild(fragment);
  }

  function normalizeCategory(value) {
    return value === 'ALL' ? 'ALL' : value.replace(/\\/g, '/');
  }

  function updateProgress() {
    const total = normalizedFeatures.length;
    const done = Object.keys(state.completed).length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    progressEl.textContent = `Implementation coverage: ${done}/${total} (${percent}%)`;
    if (launcherProgress) {
      launcherProgress.textContent = `${done}/${total}`;
    }
  }

  async function executeAction(action) {
    try {
      showActionMessage('info', `Running ${action.label}�`);
      const result = await action.run();
      if (action.categories) {
        autoCompleteCategories(action.categories);
      }
      showActionMessage('success', result || `${action.label} complete.`);
    } catch (error) {
      showActionMessage('error', error.message || `Failed to run ${action.label}.`);
    }
  }

  function autoCompleteCategories(categoryList) {
    const entries = Array.isArray(categoryList) ? categoryList : [categoryList];
    let changed = false;
    entries.forEach((entryRaw) => {
      const entry = (entryRaw || '').replace(/\\/g, '/');
      if (!entry) {
        return;
      }
      const target = normalizedFeatures.find((feature) => {
        if (state.completed[feature.id]) {
          return false;
        }
        if (entry === 'ROOT') {
          return feature.majorCategory === 'ROOT';
        }
        if (feature.majorCategory === entry) {
          return true;
        }
        if (feature.categoryPath === entry) {
          return true;
        }
        return feature.categoryPath.startsWith(`${entry}/`);
      });
      if (target) {
        state.completed[target.id] = true;
        changed = true;
      }
    });
    if (changed) {
      saveState(state);
      renderFeatures();
      updateProgress();
    }
  }

  function setFeatureStatus(id, done) {
    if (done) {
      state.completed[id] = true;
    } else {
      delete state.completed[id];
    }
    saveState(state);
    renderFeatures();
    updateProgress();
  }

  function isComplete(feature) {
    return Boolean(state.completed[feature.id]);
  }

  function showActionMessage(type, message) {
    if (!actionLog) {
      return;
    }
    const entry = document.createElement('div');
    entry.className = `guideline-action-log__entry is-${type}`;
    const time = new Date().toLocaleTimeString();
    entry.textContent = `[${time}] ${message}`;
    actionLog.prepend(entry);
    while (actionLog.childElementCount > 8) {
      actionLog.removeChild(actionLog.lastElementChild);
    }
  }
}

function formatName(name) {
  if (!name) {
    return '';
  }
  const cleaned = name.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return '';
  }
  return cleaned.split(' ').map((word) => {
    if (!word) {
      return '';
    }
    if (word.length <= 3 && word === word.toUpperCase()) {
      return word;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

function formatCategoryLabel(category) {
  const normalized = (category || 'ROOT').replace(/\\/g, '/');
  if (!normalized || normalized === 'ROOT') {
    return 'Overview';
  }
  if (normalized.length <= 3 && normalized === normalized.toUpperCase()) {
    return normalized;
  }
  return formatName(normalized);
}

function needDZ(timeout = 5000) {
  if (window.DZ && window.DZ.exports) {
    return Promise.resolve(window.DZ);
  }
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const check = () => {
      if (window.DZ && window.DZ.exports) {
        resolve(window.DZ);
        return;
      }
      if (performance.now() - start > timeout) {
        reject(new Error('Start the simulation first (press Play) to load WASM exports.'));
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadState() {
  try {
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    if (!raw) {
      return { completed: {} };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { completed: {} };
    }
    const completed = parsed.completed && typeof parsed.completed === 'object' ? parsed.completed : {};
    return { completed };
  } catch (error) {
    console.warn('[GuidelineShowcase] Failed to load state', error);
    return { completed: {} };
  }
}

function saveState(state) {
  try {
    window.localStorage?.setItem(STORAGE_KEY, JSON.stringify({ completed: state.completed }));
  } catch (error) {
    console.warn('[GuidelineShowcase] Failed to save state', error);
  }
}

async function tryCopy(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    // ignore and fallback
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch (error) {
    return false;
  }
}

// Export cleanup function for external use
export { cleanupEventListeners };
