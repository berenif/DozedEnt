// Environment generation and WASM bridge helpers

export function loadEnvironmentFromWasm(renderer, wasmModule) {
  try {
    renderer.currentBiome = wasmModule.get_current_biome();
    const objectCount = wasmModule.get_environment_object_count();
    const safeObjectCount = Number.isInteger(objectCount) && objectCount >= 0 ? Math.min(objectCount, 1000) : 0;

    for (let i = 0; i < safeObjectCount; i++) {
      try {
        const envObj = {
          type: getEnvironmentTypeString(wasmModule.get_environment_object_type(i)),
          x: wasmModule.get_environment_object_x(i),
          y: wasmModule.get_environment_object_y(i),
          width: wasmModule.get_environment_object_width(i),
          height: wasmModule.get_environment_object_height(i),
          isInteractable: wasmModule.get_environment_object_is_interactable(i) === 1,
          isSolid: wasmModule.get_environment_object_is_solid(i) === 1,
          stateFlags: wasmModule.get_environment_object_state_flags(i),
        };

        if (envObj.isInteractable) {
          renderer.interactables.push({
            type: envObj.type,
            x: envObj.x,
            y: envObj.y,
            width: envObj.width,
            height: envObj.height,
            opened: (envObj.stateFlags & 1) !== 0,
            activated: (envObj.stateFlags & 2) !== 0,
            locked: (envObj.stateFlags & 4) !== 0,
          });
        } else {
          renderer.decorations.push(envObj);
        }

        renderer.environmentObjects.push(envObj);
      } catch (objError) {
        console.error(`Error loading environment object at index ${i}:`, objError);
        break;
      }
    }

    renderer.weather = {
      type: getWeatherTypeFromWasm(wasmModule),
      intensity: wasmModule.get_weather_rain_intensity(),
      temperature: wasmModule.get_weather_temperature(),
      humidity: wasmModule.get_weather_humidity(),
      windSpeed: wasmModule.get_weather_wind_speed(),
      lightningActive: wasmModule.is_lightning_active() === 1,
    };

    console.log(`Loaded ${objectCount} environment objects from WASM for biome ${renderer.currentBiome}`);
  } catch (error) {
    console.warn('Failed to load environment from WASM, falling back to legacy generation:', error);
    generateLegacyEnvironment(renderer);
  }
}

export function getEnvironmentTypeString(typeEnum) {
  const typeMap = {
    0: 'tree',
    1: 'rock',
    2: 'bush',
    3: 'swamp_tree',
    4: 'lilypad',
    5: 'snow_patch',
    6: 'grass_tuft',
    7: 'crate',
    8: 'barrel',
    9: 'chest',
    10: 'lever',
    11: 'door',
  };
  return typeMap[typeEnum] || 'unknown';
}

export function getWeatherTypeFromWasm(wasmModule) {
  const rainIntensity = wasmModule.get_weather_rain_intensity();
  const temperature = wasmModule.get_weather_temperature();
  const lightning = wasmModule.is_lightning_active() === 1;

  if (lightning) return 'storm';
  if (rainIntensity > 0.5) return 'rain';
  if (rainIntensity > 0.2) return 'fog';
  if (temperature < 5) return 'snow';
  return 'clear';
}

export function initializeEnvironment(renderer, wasmModule = null) {
  renderer.platforms = [];
  renderer.decorations = [];
  renderer.interactables = [];
  renderer.environmentObjects = [];

  // Ground
  renderer.platforms.push({
    x: 0,
    y: 450,
    width: 2000,
    height: 100,
    type: 'ground',
    color: '#3e4444',
  });

  if (wasmModule) {
    loadEnvironmentFromWasm(renderer, wasmModule);
  } else {
    generateLegacyEnvironment(renderer);
  }

  renderer.lights = [
    { x: 640, y: 200, radius: 300, intensity: 0.8, color: '#ffeb3b' },
    { x: 1200, y: 250, radius: 250, intensity: 0.6, color: '#ff9800' },
    { x: 1600, y: 300, radius: 200, intensity: 0.5, color: '#03a9f4' },
  ];
}

export function generateEnvironmentInWasm(renderer, wasmModule, biomeType, seed = null) {
  if (!wasmModule) {
    console.warn('No WASM module available for environment generation');
    generateLegacyEnvironment(renderer);
    return;
  }

  try {
    const environmentSeed = seed !== null ? seed : 0;
    wasmModule.generate_environment(biomeType, environmentSeed);
    loadEnvironmentFromWasm(renderer, wasmModule);
    console.log(`Generated environment for biome ${biomeType} with seed ${environmentSeed}`);
  } catch (error) {
    console.error('Failed to generate environment in WASM:', error);
    generateLegacyEnvironment(renderer);
  }
}

export function generateForestEnvironment(renderer) {
  renderer.interactables.push(
    { type: 'chest', x: 520, y: 380, width: 40, height: 30, opened: false },
    { type: 'lever', x: 860, y: 390, width: 20, height: 40, activated: false },
    { type: 'door', x: 1300, y: 340, width: 40, height: 110, locked: true }
  );
  for (let i = 0; i < 10; i++) {
    renderer.decorations.push({ type: 'tree', x: 100 + i * 150, y: 360, width: 80, height: 150 });
    renderer.decorations.push({ type: 'bush', x: 180 + i * 150, y: 430, width: 60, height: 40 });
  }
}

export function generateSwampEnvironment(renderer) {
  renderer.interactables.push(
    { type: 'chest', x: 450, y: 410, width: 40, height: 30, opened: false },
    { type: 'lever', x: 980, y: 420, width: 20, height: 40, activated: false }
  );
  for (let i = 0; i < 8; i++) {
    renderer.decorations.push({ type: 'swamp_tree', x: 120 + i * 200, y: 420, width: 90, height: 160 });
    renderer.decorations.push({ type: 'lilypad', x: 160 + i * 200, y: 500, width: 50, height: 10 });
  }
  renderer.weather.type = 'fog';
  renderer.weather.intensity = 0.5;
}

export function generateMountainEnvironment(renderer) {
  renderer.interactables.push({ type: 'door', x: 1250, y: 320, width: 50, height: 130, locked: false });
  for (let i = 0; i < 6; i++) {
    renderer.decorations.push({ type: 'rock', x: 180 + i * 220, y: 380, width: 100, height: 70 });
    renderer.decorations.push({ type: 'snow_patch', x: 260 + i * 220, y: 390, width: 70, height: 30 });
  }
  renderer.weather.type = 'snow';
  renderer.weather.intensity = 0.6;
}

export function generatePlainsEnvironment(renderer) {
  renderer.interactables.push({ type: 'chest', x: 700, y: 470, width: 40, height: 30, opened: false });
  for (let i = 0; i < 12; i++) {
    renderer.decorations.push({ type: 'bush', x: 100 + i * 160, y: 480, width: 50, height: 30 });
    renderer.decorations.push({ type: 'grass_tuft', x: 140 + i * 160, y: 510, width: 20, height: 15 });
  }
  renderer.weather.type = 'clear';
  renderer.weather.intensity = 0;
}

export function generateDefaultEnvironment(renderer) {
  renderer.interactables.push(
    { type: 'crate', x: 600, y: 420, width: 40, height: 40 },
    { type: 'barrel', x: 800, y: 420, width: 30, height: 50 }
  );
  for (let i = 0; i < 8; i++) {
    renderer.decorations.push({ type: 'tree', x: 150 + i * 180, y: 360, width: 80, height: 150 });
    renderer.decorations.push({ type: 'rock', x: 220 + i * 180, y: 420, width: 60, height: 40 });
  }
}

export function updateBiomeVisuals(_renderer) {
  // Placeholder for any biome-visual-specific tuning
}

export function generateLegacyEnvironment(renderer) {
  switch (renderer.currentBiome) {
    case 0:
      generateForestEnvironment(renderer);
      break;
    case 1:
      generateSwampEnvironment(renderer);
      break;
    case 2:
      generateMountainEnvironment(renderer);
      break;
    case 3:
      generatePlainsEnvironment(renderer);
      break;
    default:
      generateDefaultEnvironment(renderer);
      break;
  }
}

function checkEnvironmentalHazards(renderer, playerX, playerY, wasmModule) {
  try {
    if (
      typeof wasmModule.check_environmental_hazards === 'function' &&
      typeof wasmModule.get_hazard_type === 'function'
    ) {
      const norm = renderer.worldToWasm(playerX, playerY);
      const hazardPresent = wasmModule.check_environmental_hazards(norm.x, norm.y) === 1;
      if (hazardPresent) {
        const hazardType = wasmModule.get_hazard_type();
        return {
          type: getHazardTypeName(hazardType),
          severity: getHazardSeverity(hazardType),
        };
      }
    }
  } catch (error) {
    console.warn('Failed to check environmental hazards:', error);
  }
  return null;
}

function getHazardTypeName(hazardType) {
  const hazardNames = { 0: 'lava', 1: 'quicksand', 2: 'bog', 3: 'acid', 4: 'poison_gas' };
  return hazardNames[hazardType] || 'unknown';
}

function getHazardSeverity(hazardType) {
  const severityMap = { 0: 'high', 1: 'medium', 2: 'low', 3: 'high', 4: 'medium' };
  return severityMap[hazardType] || 'low';
}

export function update(renderer, deltaTime, wasmModule = null) {
  if (renderer.environmentObjects) {
    renderer.environmentObjects.forEach((obj) => {
      if (obj.type === 'lilypad') {
        obj.animationOffset = (obj.animationOffset || 0) + deltaTime;
      }
    });
  }

  if (wasmModule && renderer.player) {
    const hazard = checkEnvironmentalHazards(renderer, renderer.player.x, renderer.player.y, wasmModule);
    if (hazard) {
      onEnvironmentalHazard(renderer, hazard);
    }
  }
}

// These two were instance methods; keep behavior identical
export function onEnvironmentalHazard(_renderer, hazard) {
  console.log(`Player in ${hazard.type} hazard (severity: ${hazard.severity})`);
}

export function interactWithObject(renderer, objectIndex, wasmModule) {
  if (!wasmModule) {
    return false;
  }
  try {
    const result = wasmModule.interact_with_environment_object(objectIndex);
    if (result === 1) {
      updateEnvironmentObjectState(renderer, objectIndex, wasmModule);
      return true;
    }
  } catch (error) {
    console.warn('Failed to interact with environment object:', error);
  }
  return false;
}

export function updateEnvironmentObjectState(renderer, objectIndex, wasmModule) {
  if (objectIndex < 0 || objectIndex >= renderer.environmentObjects.length) {
    return;
  }
  try {
    const newStateFlags = wasmModule.get_environment_object_state_flags(objectIndex);
    const obj = renderer.environmentObjects[objectIndex];
    if (obj.isInteractable) {
      const interactableObj = renderer.interactables.find(
        (i) => i.x === obj.x && i.y === obj.y && i.type === obj.type
      );
      if (interactableObj) {
        interactableObj.opened = (newStateFlags & 1) !== 0;
        interactableObj.activated = (newStateFlags & 2) !== 0;
        interactableObj.locked = (newStateFlags & 4) !== 0;
      }
    }
  } catch (error) {
    console.warn('Failed to update environment object state:', error);
  }
}
 
export function getCollectibleColor(type) {
  const colors = { coin: '#ffd700', gem: '#9c27b0', powerup: '#00bcd4', health: '#f44336' };
  return colors[type] || '#ffffff';
}

export function initializeCollectibles(renderer) {
  const collectibleTypes = [
    { type: 'coin', x: 350, y: 320, value: 10 },
    { type: 'coin', x: 380, y: 320, value: 10 },
    { type: 'coin', x: 410, y: 320, value: 10 },
    { type: 'gem', x: 600, y: 250, value: 50 },
    { type: 'powerup', x: 1050, y: 220, effect: 'speed' },
    { type: 'health', x: 900, y: 420, value: 25 },
  ];
  collectibleTypes.forEach((config, index) => {
    renderer.collectibles.push({
      id: `collectible_${index}`,
      ...config,
      width: config.type === 'powerup' ? 30 : 20,
      height: config.type === 'powerup' ? 30 : 20,
      collected: false,
      animationTime: Math.random() * Math.PI * 2,
      color: getCollectibleColor(config.type),
    });
  });
}
 
export function changeBiome(renderer, newBiome, wasmModule = null, seed = null) {
  renderer.currentBiome = newBiome;
  if (wasmModule) {
    generateEnvironmentInWasm(renderer, wasmModule, newBiome, seed);
  } else {
    generateLegacyEnvironment(renderer);
  }
  updateBiomeVisuals(renderer);
}
