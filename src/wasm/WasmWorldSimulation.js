/**
 * WASM World Simulation - Handles world simulation operations
 * Manages weather, time, chemistry, physics, and environmental effects
 */

export class WasmWorldSimulation {
  constructor(exports) {
    this.exports = exports;
    this.isLoaded = false;
  }

  /**
   * Set exports reference
   * @param {Object} exports - WASM exports object
   */
  setExports(exports) {
    this.exports = exports;
    this.isLoaded = Boolean(exports);
  }

  // ===== WEATHER SYSTEM =====

  /**
   * Get weather information
   * @returns {Object} Weather state object
   */
  getWeather() {
    if (!this.isLoaded) {
      return { rain: 0, windSpeed: 0, temperature: 20, lightning: false };
    }
    
    return {
      rain: typeof this.exports.get_weather_rain === 'function' ? this.exports.get_weather_rain() : 0,
      windSpeed: typeof this.exports.get_weather_wind_speed === 'function' ? this.exports.get_weather_wind_speed() : 0,
      temperature: typeof this.exports.get_weather_temperature === 'function' ? this.exports.get_weather_temperature() : 20,
      lightning: typeof this.exports.get_weather_lightning === 'function' ? this.exports.get_weather_lightning() === 1 : false
    };
  }

  /**
   * Set weather conditions
   * @param {Object} weather - Weather parameters
   */
  setWeather(weather) {
    if (!this.isLoaded) {
      return;
    }
    
    if (typeof weather.rain !== "undefined" && typeof this.exports.set_weather_rain === 'function') {
      this.exports.set_weather_rain(weather.rain);
    }
    
    if (typeof weather.wind !== "undefined" && typeof this.exports.set_weather_wind === 'function') {
      this.exports.set_weather_wind(
        weather.wind.speed || 0, 
        weather.wind.dirX || 0, 
        weather.wind.dirY || 0, 
        weather.wind.dirZ || 0
      );
    }
    
    if (typeof weather.temperature !== "undefined" && typeof this.exports.set_weather_temperature === 'function') {
      this.exports.set_weather_temperature(weather.temperature);
    }
    
    if (typeof weather.lightning !== "undefined" && typeof this.exports.set_weather_lightning === 'function') {
      this.exports.set_weather_lightning(weather.lightning ? 1 : 0);
    }
  }

  // ===== TIME SYSTEM =====

  /**
   * Get time and day information
   * @returns {Object} Time state object
   */
  getTimeInfo() {
    if (!this.isLoaded) {
      return { timeOfDay: 12, dayCount: 0, isBloodMoon: false, lightLevel: 1, isNight: false };
    }
    
    return {
      timeOfDay: typeof this.exports.get_time_of_day === 'function' ? this.exports.get_time_of_day() : 12,
      dayCount: typeof this.exports.get_day_count === 'function' ? this.exports.get_day_count() : 0,
      isBloodMoon: typeof this.exports.is_blood_moon === 'function' ? this.exports.is_blood_moon() === 1 : false,
      lightLevel: typeof this.exports.get_light_level === 'function' ? this.exports.get_light_level() : 1,
      isNight: typeof this.exports.is_night_time === 'function' ? this.exports.is_night_time() === 1 : false
    };
  }

  /**
   * Set time scale (speed up/slow down time)
   * @param {number} scale - Time scale multiplier
   */
  setTimeScale(scale) {
    if (!this.isLoaded || typeof this.exports.set_time_scale !== 'function') {
      return;
    }
    this.exports.set_time_scale(scale);
  }

  // ===== CHEMISTRY SYSTEM =====

  /**
   * Get chemistry state at position
   * @param {number} x - X coordinate (0-1)
   * @param {number} y - Y coordinate (0-1)
   * @returns {Object} Chemistry state object
   */
  getChemistryState(x, y) {
    if (!this.isLoaded) {
      return { states: 0, temperature: 20, fuel: 0 };
    }
    
    return {
      states: typeof this.exports.get_chemistry_state === 'function' ? this.exports.get_chemistry_state(x, y) : 0,
      temperature: typeof this.exports.get_chemistry_temperature === 'function' ? this.exports.get_chemistry_temperature(x, y) : 20,
      fuel: typeof this.exports.get_chemistry_fuel === 'function' ? this.exports.get_chemistry_fuel(x, y) : 0,
      fireIntensity: typeof this.exports.get_chemistry_intensity === 'function' ? this.exports.get_chemistry_intensity(x, y, 1) : 0,
      waterIntensity: typeof this.exports.get_chemistry_intensity === 'function' ? this.exports.get_chemistry_intensity(x, y, 2) : 0,
      electricIntensity: typeof this.exports.get_chemistry_intensity === 'function' ? this.exports.get_chemistry_intensity(x, y, 8) : 0
    };
  }

  /**
   * Apply chemistry effects to area
   * @param {string} effect - Effect type ('fire', 'water', 'electric')
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} radius - Effect radius
   * @param {number} intensity - Effect intensity
   */
  applyChemistryEffect(effect, x, y, radius, intensity) {
    if (!this.isLoaded) {
      return;
    }
    
    switch (effect) {
      case 'fire':
        if (typeof this.exports.ignite_area === 'function') {
          this.exports.ignite_area(x, y, radius, intensity);
        }
        break;
      case 'water':
        if (typeof this.exports.douse_area === 'function') {
          this.exports.douse_area(x, y, radius, intensity);
        }
        break;
      case 'electric':
        if (typeof this.exports.electrify_area === 'function') {
          this.exports.electrify_area(x, y, radius, intensity);
        }
        break;
    }
  }

  // ===== TERRAIN SYSTEM =====

  /**
   * Get terrain information at position
   * @param {number} x - X coordinate (0-1)
   * @param {number} y - Y coordinate (0-1)
   * @returns {Object} Terrain information
   */
  getTerrainInfo(x, y) {
    if (!this.isLoaded) {
      return { elevation: 0, moisture: 0.5, climateZone: 0 };
    }
    
    return {
      elevation: typeof this.exports.get_terrain_elevation === 'function' ? this.exports.get_terrain_elevation(x, y) : 0,
      moisture: typeof this.exports.get_terrain_moisture === 'function' ? this.exports.get_terrain_moisture(x, y) : 0.5,
      climateZone: typeof this.exports.get_climate_zone === 'function' ? this.exports.get_climate_zone(x, y) : 0
    };
  }

  // ===== PHYSICS SYSTEM =====

  /**
   * Create physics body
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} z - Z position
   * @param {number} mass - Body mass
   * @param {number} radius - Body radius
   * @returns {number} Body ID
   */
  createPhysicsBody(x, y, z, mass, radius) {
    if (!this.isLoaded || typeof this.exports.create_rigid_body !== 'function') {
      return 0xFFFFFFFF;
    }
    return this.exports.create_rigid_body(x, y, z, mass, radius);
  }

  /**
   * Get physics body position
   * @param {number} bodyId - Body ID
   * @returns {Object} Position object
   */
  getPhysicsBodyPosition(bodyId) {
    if (!this.isLoaded) {
      return { x: 0, y: 0, z: 0 };
    }
    
    return {
      x: typeof this.exports.get_body_x === 'function' ? this.exports.get_body_x(bodyId) : 0,
      y: typeof this.exports.get_body_y === 'function' ? this.exports.get_body_y(bodyId) : 0,
      z: typeof this.exports.get_body_z === 'function' ? this.exports.get_body_z(bodyId) : 0
    };
  }

  /**
   * Apply force to physics body
   * @param {number} bodyId - Body ID
   * @param {number} fx - Force X
   * @param {number} fy - Force Y
   * @param {number} fz - Force Z
   */
  applyForce(bodyId, fx, fy, fz) {
    if (!this.isLoaded || typeof this.exports.apply_force_to_body !== 'function') {
      return;
    }
    this.exports.apply_force_to_body(bodyId, fx, fy, fz);
  }

  // ===== EXPLOSION SYSTEM =====

  /**
   * Create explosion
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} z - Z position
   * @param {number} radius - Explosion radius
   * @param {number} force - Explosion force
   * @param {number} speed - Expansion speed
   * @returns {number} Explosion ID
   */
  createExplosion(x, y, z, radius, force, speed = 10) {
    if (!this.isLoaded || typeof this.exports.create_explosion_at !== 'function') {
      return 0xFFFFFFFF;
    }
    return this.exports.create_explosion_at(x, y, z, radius, force, speed);
  }

  /**
   * Get active explosions
   * @returns {Array} Array of explosion data
   */
  getExplosions() {
    if (!this.isLoaded || typeof this.exports.get_explosion_count !== 'function') {
      return [];
    }
    
    const count = this.exports.get_explosion_count();
    const explosions = [];
    
    for (let i = 0; i < count; i++) {
      if (typeof this.exports.is_explosion_active === 'function' && this.exports.is_explosion_active(i)) {
        explosions.push({
          id: i,
          x: typeof this.exports.get_explosion_x === 'function' ? this.exports.get_explosion_x(i) : 0,
          y: typeof this.exports.get_explosion_y === 'function' ? this.exports.get_explosion_y(i) : 0,
          z: typeof this.exports.get_explosion_z === 'function' ? this.exports.get_explosion_z(i) : 0,
          radius: typeof this.exports.get_explosion_current_radius === 'function' ? this.exports.get_explosion_current_radius(i) : 0
        });
      }
    }
    
    return explosions;
  }

  // ===== HEAT SYSTEM =====

  /**
   * Create heat source
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} z - Z position
   * @param {number} temperature - Temperature in Celsius
   * @param {number} radius - Heat radius
   * @returns {number} Heat source ID
   */
  createHeatSource(x, y, z, temperature, radius) {
    if (!this.isLoaded || typeof this.exports.create_heat_source !== 'function') {
      return 0xFFFFFFFF;
    }
    return this.exports.create_heat_source(x, y, z, temperature, radius);
  }

  // ===== SOUND SYSTEM =====

  /**
   * Emit sound event
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} z - Z position
   * @param {number} volume - Sound volume
   * @param {number} frequency - Sound frequency
   */
  emitSound(x, y, z, volume, frequency = 1000) {
    if (!this.isLoaded || typeof this.exports.emit_sound !== 'function') {
      return;
    }
    this.exports.emit_sound(x, y, z, volume, frequency);
  }

  /**
   * Get active sound events
   * @returns {Array} Array of sound event data
   */
  getSoundEvents() {
    if (!this.isLoaded || typeof this.exports.get_sound_event_count !== 'function') {
      return [];
    }
    
    const count = this.exports.get_sound_event_count();
    const sounds = [];
    
    for (let i = 0; i < count; i++) {
      sounds.push({
        x: typeof this.exports.get_sound_x === 'function' ? this.exports.get_sound_x(i) : 0,
        y: typeof this.exports.get_sound_y === 'function' ? this.exports.get_sound_y(i) : 0,
        volume: typeof this.exports.get_sound_volume === 'function' ? this.exports.get_sound_volume(i) : 0
      });
    }
    
    return sounds;
  }
}
