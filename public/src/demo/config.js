const params = new URLSearchParams(window.location.search);

const parseLoader = () => {
  const raw = (params.get('loader') || '').toLowerCase();
  if (raw === 'lazy') {return 'lazy';}
  if (raw === 'direct') {return 'direct';}
  return 'direct';
};

const parseSeed = () => {
  const raw = params.get('seed');
  if (raw === null || raw === '') {return null;}
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

const parseWeapon = () => {
  const raw = params.get('weapon');
  if (raw === null || raw === '') {return 0;}
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0) {return 0;}
  return value;
};

const parseDebug = () => {
  const raw = params.get('debug');
  return raw === '1' || raw === 'true';
};

const parseSpeed = () => {
  const raw = params.get('speed');
  if (raw === null || raw === '') {return 1;}
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value <= 0) {return 1;}
  return Math.min(4, Math.max(0.1, value));
};

const parseFps = () => {
  const raw = params.get('fps');
  if (!raw) {return null;}
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value <= 0) {return null;}
  return value;
};

const baseConfig = Object.freeze({
  loader: parseLoader(),
  seed: parseSeed(),
  weapon: parseWeapon(),
  debug: parseDebug(),
  speed: parseSpeed(),
  fps: parseFps()
});

const featureFlags = Object.create(null);

export const config = baseConfig;
export const getConfig = () => config;
export const getParams = () => params;

export const setFlag = (key, value) => {
  if (!key) {return;}
  featureFlags[key] = value;
};

export const getFlag = (key, fallback = undefined) => key in featureFlags ? featureFlags[key] : fallback;

export const allFlags = () => ({ ...featureFlags });

// Seed initial feature flags
if (config.debug) {
  featureFlags.debug = true;
}
if (config.loader === 'lazy') {
  featureFlags.lazyLoader = true;
}
