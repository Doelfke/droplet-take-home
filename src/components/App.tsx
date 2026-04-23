/**
 * App.tsx — Root layout component.
 */

import { useIntersection } from '../hooks/useIntersection';
import { IntersectionCanvas } from './IntersectionCanvas';
import { Controls } from './Controls';

export function App() {
  const { state, speedMultiplier, setSpeedMultiplier, handleWalk, paused, setPaused } =
    useIntersection();

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <h1 style={styles.title}>🚦 Traffic Intersection Simulator</h1>
        <p style={styles.subtitle}>4-way intersection · adaptive signals · pedestrian crossings</p>
      </header>

      <main style={styles.main}>
        <IntersectionCanvas state={state} />
        <Controls
          state={state}
          speedMultiplier={speedMultiplier}
          paused={paused}
          onWalk={handleWalk}
          onSpeedChange={setSpeedMultiplier}
          onPauseToggle={() => setPaused(!paused)}
        />
      </main>

      <footer style={styles.footer}>
        <Legend />
      </footer>
    </div>
  );
}

function Legend() {
  const items = [
    { color: '#4aa8ff', label: 'Northbound' },
    { color: '#ff7a4a', label: 'Southbound' },
    { color: '#7aff7a', label: 'Eastbound' },
    { color: '#ff7aff', label: 'Westbound' },
  ];
  return (
    <div style={styles.legend}>
      {items.map(({ color, label }) => (
        <div key={label} style={styles.legendItem}>
          <div style={{ ...styles.legendSwatch, background: color }} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 16px',
    gap: 20,
    background: 'linear-gradient(160deg, #0f1826 0%, #1a2a3a 100%)',
    color: '#c0d8ff',
  },
  header: {
    textAlign: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 800,
    letterSpacing: '-0.02em',
    marginBottom: 4,
    background: 'linear-gradient(90deg, #4aa8ff, #7aff7a)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: 13,
    color: '#607090',
  },
  main: {
    display: 'flex',
    gap: 20,
    alignItems: 'flex-start',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  footer: {
    marginTop: 8,
  },
  legend: {
    display: 'flex',
    gap: 20,
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: '#8090a0',
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
};
