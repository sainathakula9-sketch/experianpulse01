import type { AuthenticatedUser, LoginResult, PulseSnapshot, RequirementInput, RequirementRecord } from '../../shared/types'

declare global {
  interface Window {
    experianPulse: {
      login: (username: string, password: string) => Promise<LoginResult>
      logout: () => Promise<boolean>
      getSnapshot: (user?: AuthenticatedUser) => Promise<PulseSnapshot>
      createRequirement: (requirement: RequirementInput) => Promise<RequirementRecord>
      updateRequirement: (id: number, requirement: RequirementInput) => Promise<RequirementRecord>
    }
  }
}

export {}
