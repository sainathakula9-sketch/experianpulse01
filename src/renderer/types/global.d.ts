import type { AuthenticatedUser, CandidateInput, CandidateRecord, LoginResult, PulseSnapshot, RequirementInput, RequirementIntakeInput, RequirementIntakeRecord, RequirementRecord, RequirementSearchStringInput, RequirementSearchStringRecord } from '../../shared/types'

declare global {
  interface Window {
    experianPulse: {
      login: (username: string, password: string) => Promise<LoginResult>
      logout: () => Promise<boolean>
      getSnapshot: (user?: AuthenticatedUser) => Promise<PulseSnapshot>
      createCandidate: (candidate: CandidateInput) => Promise<CandidateRecord>
      updateCandidate: (id: number, candidate: CandidateInput) => Promise<CandidateRecord>
      deleteCandidate: (id: number) => Promise<boolean>
      createRequirement: (requirement: RequirementInput) => Promise<RequirementRecord>
      updateRequirement: (id: number, requirement: RequirementInput) => Promise<RequirementRecord>
      saveRequirementIntake: (requirementId: number, intake: RequirementIntakeInput) => Promise<RequirementIntakeRecord>
      saveRequirementSearchStrings: (requirementId: number, searchStrings: RequirementSearchStringInput) => Promise<RequirementSearchStringRecord>
    }
  }
}

export {}
