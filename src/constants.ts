// ---------------------------------------------------------------------------
// Simulation timing
// ---------------------------------------------------------------------------
export const TICK_RATE_MS = 16; // ~60fps target
export const SPEED_MULTIPLIERS = [0.5, 1, 2, 5, 10] as const;

// ---------------------------------------------------------------------------
// Phase durations (milliseconds, simulation time)
// ---------------------------------------------------------------------------
export const MIN_GREEN_STRAIGHT_MS = 10_000;
export const MAX_GREEN_STRAIGHT_MS = 45_000;
export const MIN_GREEN_LEFT_MS = 5_000;
export const MAX_GREEN_LEFT_MS = 20_000;
export const YELLOW_DURATION_MS = 3_000;
export const PEDESTRIAN_CLEAR_MS = 6_000;

// ---------------------------------------------------------------------------
// Sensor / starvation
// ---------------------------------------------------------------------------
export const STARVATION_THRESHOLD_MS = 120_000; // 2 minutes before override
export const SENSOR_EXTEND_PER_CAR_MS = 2_000; // extra time per waiting car

// ---------------------------------------------------------------------------
// Car arrival / departure
// ---------------------------------------------------------------------------
/** Mean inter-arrival gap per lane (ms, real time). Poisson-like. */
export const CAR_ARRIVAL_MEAN_MS = 3_500;
/** Time (ms) for one car to clear the intersection box. */
export const CAR_CLEARANCE_MS = 2_000;
/** Stagger between successive cars departing from the same direction. */
export const CAR_DEPARTURE_STAGGER_MS = 1_600;

// ---------------------------------------------------------------------------
// Flashing-orange animation
// ---------------------------------------------------------------------------
export const FLASHING_ORANGE_HALF_PERIOD_MS = 500;

// ---------------------------------------------------------------------------
// Canvas geometry
// ---------------------------------------------------------------------------
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 800;
export const CENTER_X = 400;
export const CENTER_Y = 400;

/** Width of a single lane in pixels. */
export const LANE_W = 22;
/** 4 lanes per direction (left, straight×2, right). */
export const LANES_PER_DIR = 4;
/** Half-width of one side of the road (4 lanes). */
export const ROAD_HALF = LANE_W * LANES_PER_DIR; // 88 px

/** Inner edge of the intersection box from centre. */
export const BOX_INSET = ROAD_HALF; // 88 px

/** Length of the visible approach arm (outside the box). */
export const ARM_LENGTH = 200;

// Derived box edges
export const BOX_LEFT = CENTER_X - BOX_INSET; // 312
export const BOX_RIGHT = CENTER_X + BOX_INSET; // 488
export const BOX_TOP = CENTER_Y - BOX_INSET; // 312
export const BOX_BOTTOM = CENTER_Y + BOX_INSET; // 488

/** Car rectangle dimensions. */
export const CAR_W = 14;
export const CAR_H = 9;
