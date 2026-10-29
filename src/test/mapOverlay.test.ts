import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  calculatePinLayout,
  calculateDirectionLayout,
  randomHeadingDegrees,
} from '@/lib/canvasRenderer';

// Real asset dimensions from /public.
const PIN_W = 112;
const PIN_H = 164;
const DIR_W = 416;
const DIR_H = 272;

const MINI_MAP_W = 316;
const MINI_MAP_H = 298;
const SCALE = 1.4815;

describe('calculateDirectionLayout', () => {
  it('anchors the icon at the bottom-centre, not the geometric centre', () => {
    const layout = calculateDirectionLayout(MINI_MAP_W, MINI_MAP_H, SCALE, DIR_W, DIR_H, 45);
    expect(layout.anchorX).toBe(MINI_MAP_W / 2);
    expect(layout.anchorY).toBe(MINI_MAP_H / 2);
  });

  it('keeps the icon aspect ratio of the source file', () => {
    const layout = calculateDirectionLayout(MINI_MAP_W, MINI_MAP_H, SCALE, DIR_W, DIR_H, 0);
    expect(layout.width).toBeCloseTo(Math.min(MINI_MAP_W * 0.62, 180 * SCALE), 6);
    expect(layout.height / layout.width).toBeCloseTo(DIR_H / DIR_W, 6);
  });

  it('converts the heading from degrees to radians', () => {
    const at = (deg: number) =>
      calculateDirectionLayout(MINI_MAP_W, MINI_MAP_H, SCALE, DIR_W, DIR_H, deg).angleRadians;
    expect(at(0)).toBe(0);
    expect(at(90)).toBeCloseTo(Math.PI / 2, 10);
    expect(at(180)).toBeCloseTo(Math.PI, 10);
    expect(at(270)).toBeCloseTo((3 * Math.PI) / 2, 10);
    expect(at(360)).toBeCloseTo(2 * Math.PI, 10);
  });

  it('falls back to a square aspect when the image width is unknown', () => {
    const layout = calculateDirectionLayout(MINI_MAP_W, MINI_MAP_H, SCALE, 0, DIR_H, 10);
    expect(layout.height / layout.width).toBeCloseTo(1, 6);
  });
});

describe('pin and direction alignment', () => {
  it('puts the direction anchor exactly on the map pin tip', () => {
    const pin = calculatePinLayout(MINI_MAP_W, MINI_MAP_H, SCALE, PIN_W, PIN_H);
    const direction = calculateDirectionLayout(MINI_MAP_W, MINI_MAP_H, SCALE, DIR_W, DIR_H, 137);

    // Pin tip = bottom-centre of the pin image.
    const pinTipX = pin.x + pin.width / 2;
    const pinTipY = pin.y + pin.height;

    expect(pinTipX).toBeCloseTo(direction.anchorX, 6);
    expect(pinTipY).toBeCloseTo(direction.anchorY, 6);
  });

  it('keeps the pin tip on the mini map centre in both orientations', () => {
    for (const [w, h, scale] of [
      [316, 298, 1.48],
      [298, 316, 1.1],
    ] as [number, number, number][]) {
      const pin = calculatePinLayout(w, h, scale, PIN_W, PIN_H);
      expect(pin.x + pin.width / 2).toBeCloseTo(w / 2, 6);
      expect(pin.y + pin.height).toBeCloseTo(h / 2, 6);
    }
  });

  it('keeps the pin inside the mini map bounds', () => {
    const pin = calculatePinLayout(MINI_MAP_W, MINI_MAP_H, SCALE, PIN_W, PIN_H);
    expect(pin.x).toBeGreaterThan(0);
    expect(pin.y).toBeGreaterThan(0);
    expect(pin.x + pin.width).toBeLessThan(MINI_MAP_W);
    expect(pin.y + pin.height).toBeLessThan(MINI_MAP_H);
  });
});

describe('randomHeadingDegrees', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a value inside the 0-360 degree range', () => {
    for (let i = 0; i < 200; i++) {
      const heading = randomHeadingDegrees();
      expect(heading).toBeGreaterThanOrEqual(0);
      expect(heading).toBeLessThan(360);
    }
  });

  it('follows Math.random, so both range ends are reachable', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0);
    expect(randomHeadingDegrees()).toBe(0);
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.999999);
    expect(randomHeadingDegrees()).toBeGreaterThan(359.99);
  });
});
