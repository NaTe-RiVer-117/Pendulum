// DebugUI.jsx
import { useControls } from 'leva';

export function useDebugUI() {
  return useControls({
    length: { value: 4, min: 1, max: 4, step: 0.1 },
    mass: { value: 1, min: 1, max: 50, step: 0.1 },
    impulse: { value: 100, min: 5, max: 300, step: 1 },
    dampingCoefficient: { value: 0.02, min: 0.001, max: 0.5, step: 0.001 }
  });
}
