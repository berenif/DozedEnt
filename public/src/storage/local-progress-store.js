// LocalProgressStore: versioned localStorage persistence for per-class progression
// Schema: { schemaVersion:1, classId:string, essence:number, nodes:{ [nodeId:string]: number } }

const SCHEMA_VERSION = 1;
const BASE_KEY = 'dozed.progression.v1.local';

function makeKey(classId) {
  return `${BASE_KEY}.${classId}`;
}

export class LocalProgressStore {
  load(classId) {
    try {
      const raw = localStorage.getItem(makeKey(classId));
      if (!raw) return null;
      const data = JSON.parse(raw);
      return this.migrate(data);
    } catch {
      return null;
    }
  }

  save(state) {
    if (!state || !state.classId) return;
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      classId: state.classId,
      essence: typeof state.essence === 'number' ? state.essence : 0,
      nodes: state.nodes || {}
    };
    localStorage.setItem(makeKey(state.classId), JSON.stringify(payload));
  }

  clear(classId) {
    localStorage.removeItem(makeKey(classId));
  }

  migrate(payload) {
    if (!payload || typeof payload !== 'object') return null;
    const version = payload.schemaVersion || 0;
    if (version === SCHEMA_VERSION) return payload;
    // Future migrations: transform older payloads. For now, reset but back up.
    try {
      const backupKey = `${makeKey(payload.classId || 'unknown')}.backup.v${version}`;
      localStorage.setItem(backupKey, JSON.stringify(payload));
    } catch {}
    return { schemaVersion: SCHEMA_VERSION, classId: payload.classId, essence: 0, nodes: {} };
  }
}

export function defaultEmptyState(classId) {
  return { schemaVersion: SCHEMA_VERSION, classId, essence: 0, nodes: {} };
}

