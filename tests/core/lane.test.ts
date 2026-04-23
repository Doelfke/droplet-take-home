import { describe, it, expect } from 'vitest';
import {
  createEmptyLanes,
  enqueue,
  dequeue,
  replaceLane,
  totalWaiting,
  waitingForDirection,
} from '../../src/core/lane';
import { createCar } from '../../src/core/car';
import { DIRECTIONS, LANE_TYPES } from '../../src/core/signal';

describe('createEmptyLanes', () => {
  it('creates every direction/laneType with an empty queue', () => {
    const lanes = createEmptyLanes();

    for (const dir of DIRECTIONS) {
      for (const type of LANE_TYPES) {
        expect(lanes[dir][type].direction).toBe(dir);
        expect(lanes[dir][type].type).toBe(type);
        expect(lanes[dir][type].queue).toHaveLength(0);
      }
    }
  });
});

describe('enqueue/dequeue/replaceLane', () => {
  it('enqueue appends to queue and returns new lane state', () => {
    const lanes = createEmptyLanes();
    const carA = createCar(1, 'north', 'straight', 0);
    const updated = enqueue(lanes, 'north', 'straight', carA);

    expect(lanes.north.straight.queue).toHaveLength(0);
    expect(updated.north.straight.queue).toHaveLength(1);
    expect(updated.north.straight.queue[0]).toBe(carA);
  });

  it('dequeue removes the queue head only', () => {
    let lanes = createEmptyLanes();
    const carA = createCar(1, 'north', 'straight', 0);
    const carB = createCar(2, 'north', 'straight', 10);
    lanes = enqueue(lanes, 'north', 'straight', carA);
    lanes = enqueue(lanes, 'north', 'straight', carB);

    const updated = dequeue(lanes, 'north', 'straight');

    expect(updated.north.straight.queue).toHaveLength(1);
    expect(updated.north.straight.queue[0]).toBe(carB);
  });

  it('replaceLane swaps only the specified lane', () => {
    const lanes = createEmptyLanes();
    const replacement = {
      direction: 'east' as const,
      type: 'left' as const,
      queue: [createCar(9, 'east', 'left', 100)],
    };

    const updated = replaceLane(lanes, 'east', 'left', replacement);

    expect(updated.east.left.queue).toHaveLength(1);
    expect(updated.west.right.queue).toHaveLength(0);
    expect(lanes.east.left.queue).toHaveLength(0);
  });
});

describe('count helpers', () => {
  it('totalWaiting sums cars across all directions and lane types', () => {
    let lanes = createEmptyLanes();
    lanes = enqueue(lanes, 'north', 'left', createCar(1, 'north', 'left', 0));
    lanes = enqueue(lanes, 'north', 'straight', createCar(2, 'north', 'straight', 1));
    lanes = enqueue(lanes, 'south', 'right', createCar(3, 'south', 'right', 2));
    lanes = enqueue(lanes, 'east', 'straight', createCar(4, 'east', 'straight', 3));

    expect(totalWaiting(lanes)).toBe(4);
  });

  it('totalWaiting returns 0 for fresh lanes', () => {
    expect(totalWaiting(createEmptyLanes())).toBe(0);
  });

  it('waitingForDirection sums all lanes for one direction', () => {
    let lanes = createEmptyLanes();
    lanes = enqueue(lanes, 'west', 'left', createCar(1, 'west', 'left', 0));
    lanes = enqueue(lanes, 'west', 'straight', createCar(2, 'west', 'straight', 1));
    lanes = enqueue(lanes, 'west', 'straight', createCar(3, 'west', 'straight', 2));
    lanes = enqueue(lanes, 'west', 'right', createCar(4, 'west', 'right', 3));
    lanes = enqueue(lanes, 'east', 'left', createCar(5, 'east', 'left', 4));

    expect(waitingForDirection(lanes, 'west')).toBe(4);
    expect(waitingForDirection(lanes, 'east')).toBe(1);
  });
});
