/**
 * Controls.tsx
 * Walk buttons, speed selector, pause toggle, and live stats panel.
 */

import { Direction } from '../core/signal';
import { IntersectionPhase } from '../core/phases';
import { IntersectionState } from '../core/intersection';
import { SPEED_MULTIPLIERS } from '../constants';

interface Props {
  state: IntersectionState;
  speedMultiplier: number;
  paused: boolean;
  onWalk: (dir: Direction) => void;
  onSpeedChange: (v: number) => void;
  onPauseToggle: () => void;
}

const PHASE_LABELS: Record<IntersectionPhase, string> = {
  [IntersectionPhase.NS_STRAIGHT]: 'N/S Straight ●',
  [IntersectionPhase.NS_YELLOW]: 'N/S Yellow ●',
  [IntersectionPhase.NS_LEFT]: 'N/S Left Turn ●',
  [IntersectionPhase.NS_LEFT_YELLOW]: 'N/S Left Yellow ●',
  [IntersectionPhase.EW_STRAIGHT]: 'E/W Straight ●',
  [IntersectionPhase.EW_YELLOW]: 'E/W Yellow ●',
  [IntersectionPhase.EW_LEFT]: 'E/W Left Turn ●',
  [IntersectionPhase.EW_LEFT_YELLOW]: 'E/W Left Yellow ●',
  [IntersectionPhase.PEDESTRIAN_CLEAR]: 'WALK ●',
};

const PHASE_COLORS: Record<IntersectionPhase, string> = {
  [IntersectionPhase.NS_STRAIGHT]: '#30c060',
  [IntersectionPhase.NS_YELLOW]: '#e0c030',
  [IntersectionPhase.NS_LEFT]: '#30c060',
  [IntersectionPhase.NS_LEFT_YELLOW]: '#e0c030',
  [IntersectionPhase.EW_STRAIGHT]: '#30c060',
  [IntersectionPhase.EW_YELLOW]: '#e0c030',
  [IntersectionPhase.EW_LEFT]: '#30c060',
  [IntersectionPhase.EW_LEFT_YELLOW]: '#e0c030',
  [IntersectionPhase.PEDESTRIAN_CLEAR]: '#00aaff',
};

export function Controls({
  state,
  speedMultiplier,
  paused,
  onWalk,
  onSpeedChange,
  onPauseToggle,
}: Props) {
  const { stats, phase, phaseElapsed, phaseDuration } = state;
  const avgWait =
    stats.carsServed > 0 ? (stats.totalWaitMs / stats.carsServed / 1000).toFixed(1) : '—';

  const phaseProgress = Math.min(phaseElapsed / phaseDuration, 1);
  const phaseLabel = PHASE_LABELS[phase];
  const phaseColor = PHASE_COLORS[phase];

  const totalWaiting = (['north', 'south', 'east', 'west'] as Direction[]).reduce(
    (acc, dir) =>
      acc +
      (['left', 'straight', 'right'] as const).reduce(
        (s, t) => s + state.lanes[dir][t].queue.length,
        0,
      ),
    0,
  );

  return (
    <div style={styles.container}>
      {/* Walk buttons */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Walk Buttons</h3>
        <div style={styles.walkGrid}>
          <div />
          <WalkButton
            dir="north"
            onWalk={onWalk}
            label="▲ N"
            pending={state.pedestrian.pendingDirections.includes('north')}
          />
          <div />
          <WalkButton
            dir="west"
            onWalk={onWalk}
            label="◄ W"
            pending={state.pedestrian.pendingDirections.includes('west')}
          />
          <div style={{ textAlign: 'center', fontSize: '10px', color: '#888', lineHeight: '36px' }}>
            +
          </div>
          <WalkButton
            dir="east"
            onWalk={onWalk}
            label="E ►"
            pending={state.pedestrian.pendingDirections.includes('east')}
          />
          <div />
          <WalkButton
            dir="south"
            onWalk={onWalk}
            label="▼ S"
            pending={state.pedestrian.pendingDirections.includes('south')}
          />
          <div />
        </div>
      </section>

      {/* Speed control */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Speed</h3>
        <div style={styles.speedRow}>
          {SPEED_MULTIPLIERS.map((m) => (
            <button
              key={m}
              style={{
                ...styles.speedBtn,
                ...(speedMultiplier === m ? styles.speedBtnActive : {}),
              }}
              onClick={() => onSpeedChange(m)}
            >
              {m}×
            </button>
          ))}
        </div>
      </section>

      {/* Pause */}
      <button
        style={{ ...styles.pauseBtn, ...(paused ? styles.pauseBtnActive : {}) }}
        onClick={onPauseToggle}
      >
        {paused ? '▶ Resume' : '⏸ Pause'}
      </button>

      {/* Phase status */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Phase</h3>
        <div style={{ color: phaseColor, fontWeight: 600, fontSize: '13px', marginBottom: 6 }}>
          {phaseLabel}
        </div>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${phaseProgress * 100}%`,
              background: phaseColor,
            }}
          />
        </div>
        <div style={styles.timerText}>
          {(phaseElapsed / 1000).toFixed(1)}s / {(phaseDuration / 1000).toFixed(1)}s
        </div>
      </section>

      {/* Stats */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Stats</h3>
        <StatRow label="Cars waiting" value={String(totalWaiting)} />
        <StatRow label="Cars served" value={String(stats.carsServed)} />
        <StatRow label="Avg wait" value={`${avgWait}s`} />
        <StatRow label="Walk events" value={String(stats.pedestrianClears)} />
        <StatRow label="Sim time" value={`${(state.time / 1000).toFixed(0)}s`} />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function WalkButton({
  dir,
  label,
  pending,
  onWalk,
}: {
  dir: Direction;
  label: string;
  pending: boolean;
  onWalk: (d: Direction) => void;
}) {
  return (
    <button
      style={{ ...styles.walkBtn, ...(pending ? styles.walkBtnPending : {}) }}
      onClick={() => onWalk(dir)}
      title={`Request pedestrian crossing – ${dir}`}
    >
      {label}
    </button>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.statRow}>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    padding: '20px 16px',
    background: '#16213e',
    borderRadius: 10,
    minWidth: 200,
    maxWidth: 220,
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    color: '#6080b0',
    letterSpacing: '0.08em',
    marginBottom: 2,
  },
  walkGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 4,
  },
  walkBtn: {
    padding: '7px 4px',
    fontSize: 12,
    fontWeight: 600,
    background: '#0f3460',
    color: '#a0c0ff',
    border: '1px solid #1a4a8a',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  walkBtnPending: {
    background: '#7a5c00',
    color: '#ffcc00',
    borderColor: '#aa8800',
    animation: 'pulse 0.8s infinite',
  },
  speedRow: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap' as const,
  },
  speedBtn: {
    padding: '5px 8px',
    fontSize: 12,
    background: '#0f3460',
    color: '#80a0d0',
    border: '1px solid #1a4a8a',
    borderRadius: 5,
    cursor: 'pointer',
  },
  speedBtnActive: {
    background: '#1a6a3a',
    color: '#80ffb0',
    borderColor: '#2a9a5a',
  },
  pauseBtn: {
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 600,
    background: '#1a3a6a',
    color: '#a0c0ff',
    border: '1px solid #2a5aaa',
    borderRadius: 7,
    cursor: 'pointer',
  },
  pauseBtnActive: {
    background: '#3a1a1a',
    color: '#ff8888',
    borderColor: '#aa3333',
  },
  progressBar: {
    height: 6,
    background: '#0f1f3a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.1s linear',
  },
  timerText: {
    fontSize: 11,
    color: '#607090',
    textAlign: 'right' as const,
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
  },
  statLabel: {
    color: '#708090',
  },
  statValue: {
    color: '#c0d8ff',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },
};
