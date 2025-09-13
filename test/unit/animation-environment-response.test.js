import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WASI } from 'wasi';

describe('Animation responds to environment', () => {
  let exports;

  beforeEach(async () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const wasmPath = path.resolve(__dirname, '../../game.wasm');
    const bytes = fs.readFileSync(wasmPath);
    const wasi = new WASI({ version: 'preview1' });
    const result = await WebAssembly.instantiate(bytes, { wasi_snapshot_preview1: wasi.wasiImport });
    wasi.start(result.instance);
    exports = result.instance.exports;
    exports.start();
    // reset terrain patch used in tests if available
    if (typeof exports.set_terrain_elevation === 'function') {
      exports.set_terrain_elevation(0.5, 0.5, 0);
      exports.set_terrain_elevation(0.52, 0.5, 0);
    }
  });

  it('updates wind response from world weather', function () {
    if (typeof exports.set_weather_wind !== 'function') {
      this.skip();
    }
    exports.set_weather_wind(10, 1, 0, 0);
    exports.update(0.016);
    const wind = exports.get_anim_wind_response();
    expect(wind).to.not.equal(0);
  });

  it('shivers when temperature is cold', function () {
    if (typeof exports.set_weather_temperature !== 'function') {
      this.skip();
    }
    exports.set_weather_temperature(5);
    exports.update(0.016);
    const shiver = exports.get_anim_temperature_shiver();
    expect(shiver).to.not.equal(0);
  });

  it('adapts to ground slope', function () {
    if (typeof exports.set_terrain_elevation !== 'function') {
      this.skip();
    }
    exports.set_terrain_elevation(0.52, 0.5, 1);
    exports.update(0.016);
    const adapt = exports.get_anim_ground_adapt();
    expect(adapt).to.not.equal(0);
  });
});
