import { ProgressionCoordinator } from '../game/progression/progression-coordinator.js';

// Expects a global `ModulePromise` that resolves to the Emscripten Module
// and a container element with id 'progression-root'.

export async function startProgressionDemo(ModulePromise, classId = 'warden') {
  const root = document.getElementById('progression-root');
  const coord = new ProgressionCoordinator(ModulePromise, root, { classId, basePath: '/src' });
  await coord.start();
  return coord;
}


