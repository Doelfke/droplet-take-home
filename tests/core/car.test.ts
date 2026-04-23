import { describe, it, expect } from 'vitest';
import { createCar, startClearing, advanceClearing, isClearing } from '../../src/core/car';

describe('car helpers', () => {
  it('createCar creates a waiting car', () => {
    const car = createCar(42, 'north', 'left', 1234);
    expect(car.id).toBe(42);
    expect(car.direction).toBe('north');
    expect(car.laneType).toBe('left');
    expect(car.arrivedAt).toBe(1234);
    expect(car.clearingProgress).toBeUndefined();
  });

  it('startClearing sets clearing fields', () => {
    const car = createCar(1, 'east', 'straight', 0);
    const started = startClearing(car, 500);
    expect(started.clearingProgress).toBe(0);
    expect(started.clearingStartedAt).toBe(500);
  });

  it('advanceClearing returns updated car before completion', () => {
    const started = startClearing(createCar(1, 'west', 'right', 0), 0);
    const advanced = advanceClearing(started, 200, 1000);
    expect(advanced).not.toBeNull();
    expect(advanced?.clearingProgress).toBeCloseTo(0.2);
  });

  it('advanceClearing returns null once car fully clears', () => {
    const started = startClearing(createCar(1, 'south', 'straight', 0), 0);
    const advanced = advanceClearing(started, 1000, 1000);
    expect(advanced).toBeNull();
  });

  it('advanceClearing treats undefined progress as 0', () => {
    const waiting = createCar(7, 'north', 'right', 0);
    const advanced = advanceClearing(waiting, 250, 1000);
    expect(advanced).not.toBeNull();
    expect(advanced?.clearingProgress).toBeCloseTo(0.25);
  });

  it('isClearing is true only when progress is defined and below 1', () => {
    const waiting = createCar(1, 'north', 'left', 0);
    const active = startClearing(waiting, 0);
    const done = { ...active, clearingProgress: 1 };

    expect(isClearing(waiting)).toBe(false);
    expect(isClearing(active)).toBe(true);
    expect(isClearing(done)).toBe(false);
  });
});
