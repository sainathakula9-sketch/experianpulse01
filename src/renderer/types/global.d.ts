import type { PulseSnapshot } from '../../shared/types'

declare global {
  interface Window {
    experianPulse: {
      getSnapshot: () => Promise<PulseSnapshot>
    }
  }
}

export {}
