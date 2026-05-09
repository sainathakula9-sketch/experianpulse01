import type { CandidateRecord, PulseSnapshot, RequirementRecord } from '../../shared/types'

export type AiAssistantAction =
  | 'intake-summary'
  | 'hiring-manager-update-email'
  | 'candidate-fitment-summary'
  | 'search-strings'
  | 'weekly-recruitment-report'
  | 'offer-drop-analysis'

export interface AiAssistantRequest {
  action: AiAssistantAction
  requirement?: RequirementRecord
  candidate?: CandidateRecord
  snapshot: PulseSnapshot
}

export interface AiAssistantResult {
  title: string
  generatedAt: string
  provider: string
  content: string
}

export interface AiAssistantProvider {
  readonly id: string
  readonly label: string
  generate: (request: AiAssistantRequest) => Promise<AiAssistantResult>
}

function formatList(values: string[], fallback = 'Not captured'): string {
  const cleanValues = values.map((value) => value.trim()).filter(Boolean)
  return cleanValues.length > 0 ? cleanValues.join(', ') : fallback
}

function getRequirementCandidates(snapshot: PulseSnapshot, requirement?: RequirementRecord): CandidateRecord[] {
  if (!requirement) {
    return snapshot.candidates
  }

  return snapshot.candidates.filter((candidate) => candidate.requirementId === requirement.id)
}

function getPrimaryRequirement(snapshot: PulseSnapshot, requirement?: RequirementRecord): RequirementRecord | undefined {
  return requirement ?? snapshot.requirements[0]
}

function getPrimaryCandidate(snapshot: PulseSnapshot, candidate?: CandidateRecord, requirement?: RequirementRecord): CandidateRecord | undefined {
  if (candidate) {
    return candidate
  }

  return getRequirementCandidates(snapshot, requirement)[0] ?? snapshot.candidates[0]
}

function getPipelineSummary(candidates: CandidateRecord[]): string {
  if (candidates.length === 0) {
    return 'No candidates are currently attached to this view.'
  }

  const counts = candidates.reduce<Record<string, number>>((accumulator, candidate) => {
    accumulator[candidate.status] = (accumulator[candidate.status] ?? 0) + 1
    return accumulator
  }, {})

  return Object.entries(counts)
    .map(([status, count]) => `${status}: ${count}`)
    .join('; ')
}

function buildIntakeSummary(request: AiAssistantRequest): string {
  const requirement = getPrimaryRequirement(request.snapshot, request.requirement)
  if (!requirement) {
    return 'No requirement data is available yet. Create a requirement, capture intake details, then regenerate this placeholder summary.'
  }

  const intake = requirement.intake
  return [
    `Role: ${requirement.roleTitle} (${requirement.reqId}) for ${requirement.businessUnit}.`,
    `Hiring manager: ${requirement.hiringManager || 'Not assigned'}; priority: ${requirement.priority}; work mode/location: ${requirement.workMode} - ${requirement.location || 'TBD'}.`,
    `Role summary: ${intake?.roleSummary || 'Use the requirement form to capture a detailed role summary.'}`,
    `Must-have skills: ${formatList([intake?.mustHaveSkills ?? '', intake?.primarySkills ?? ''])}.`,
    `Good-to-have skills: ${formatList([intake?.goodToHaveSkills ?? '', intake?.secondarySkills ?? ''])}.`,
    `Target profile: ${intake?.minimumExperience || 'Minimum experience TBD'} to ${intake?.maximumExperience || 'maximum experience TBD'}, salary ${intake?.salaryRange || requirement.budgetRange || 'TBD'}, notice preference ${intake?.noticePeriodPreference || 'TBD'}.`,
    `Candidate selling points: ${intake?.candidateSellingPoints || 'Highlight brand, team mission, growth path, and role impact during outreach.'}`
  ].join('\n')
}

function buildHiringManagerUpdate(request: AiAssistantRequest): string {
  const requirement = getPrimaryRequirement(request.snapshot, request.requirement)
  const candidates = getRequirementCandidates(request.snapshot, requirement)
  if (!requirement) {
    return 'Subject: Recruitment update\n\nHi,\n\nNo active requirement is selected yet. Please select or create a requirement before generating an update.\n\nThanks,'
  }

  const shortlisted = candidates.filter((candidate) => /shortlisted|interview|offer|joined/i.test(candidate.status))
  const followUps = candidates.filter((candidate) => candidate.followUpDate).slice(0, 3)

  return [
    `Subject: ${requirement.roleTitle} recruitment update - ${requirement.reqId}`,
    '',
    `Hi ${requirement.hiringManager || 'Hiring Manager'},`,
    '',
    `Here is the latest placeholder update for ${requirement.roleTitle}:`,
    `- Pipeline: ${candidates.length} profile(s) tracked; ${getPipelineSummary(candidates)}.`,
    `- Shortlisted/interview/offer-ready profiles: ${shortlisted.length}.`,
    `- Target closure date: ${requirement.targetClosureDate || 'TBD'}; current status: ${requirement.status}.`,
    followUps.length > 0 ? `- Upcoming follow-ups: ${followUps.map((candidate) => `${candidate.name} on ${candidate.followUpDate}`).join('; ')}.` : '- Upcoming follow-ups: none recorded yet.',
    '',
    'Suggested next step: confirm interview availability and share feedback on any profiles pending review.',
    '',
    'Thanks,'
  ].join('\n')
}

function buildCandidateFitment(request: AiAssistantRequest): string {
  const requirement = getPrimaryRequirement(request.snapshot, request.requirement)
  const candidate = getPrimaryCandidate(request.snapshot, request.candidate, requirement)
  if (!candidate) {
    return 'No candidate data is available yet. Add a candidate profile to generate a fitment placeholder.'
  }

  const mustHave = requirement?.intake?.mustHaveSkills || requirement?.intake?.primarySkills || requirement?.roleTitle || 'role requirements'
  return [
    `Candidate: ${candidate.name} (${candidate.currentTitle || 'Current title not captured'} at ${candidate.currentCompany || 'company not captured'}).`,
    `Requirement: ${requirement?.roleTitle || candidate.requirementTitle || 'Not mapped'}; stage: ${candidate.status}.`,
    `Experience: ${candidate.relevantExperience || candidate.totalExperience || 'Not captured'} relevant / ${candidate.totalExperience || 'total experience not captured'} total.`,
    `Skill alignment: candidate skills (${formatList([candidate.primarySkills, candidate.secondarySkills])}) should be reviewed against ${mustHave}.`,
    `Compensation/logistics: current ${candidate.currentCtc || 'TBD'}, expected ${candidate.expectedCtc || 'TBD'}, notice ${candidate.noticePeriod || 'TBD'}, location ${candidate.location || 'TBD'}.`,
    `Placeholder recommendation: ${candidate.primarySkills ? 'Proceed with recruiter validation and hiring manager review if must-have skills are confirmed.' : 'Capture missing skills before making a fitment recommendation.'}`,
    `Notes: ${candidate.remarks || 'No recruiter remarks recorded.'}`
  ].join('\n')
}

function buildSearchStrings(request: AiAssistantRequest): string {
  const requirement = getPrimaryRequirement(request.snapshot, request.requirement)
  if (!requirement) {
    return 'No requirement selected. Create or select a requirement before generating search strings.'
  }

  const intake = requirement.intake
  const skills = formatList([intake?.primarySkills ?? '', intake?.mustHaveSkills ?? '', requirement.roleTitle], requirement.roleTitle)
  const location = requirement.location || request.snapshot.settings.defaultLocation || 'United States'
  const avoid = intake?.companiesToAvoid ? ` NOT (${intake.companiesToAvoid})` : ''

  return [
    `LinkedIn Boolean: (${skills}) AND (${location})${avoid}`,
    `GitHub search: ${skills} location:"${location}"`,
    `Naukri keywords: "${requirement.roleTitle}" ${skills} ${intake?.minimumExperience || ''} ${intake?.maximumExperience || ''}`.trim(),
    `Google X-Ray: site:linkedin.com/in ("${requirement.roleTitle}" OR ${skills}) "${location}" -jobs -hiring`,
    `Diversity sourcing: (${skills}) AND ("women in tech" OR "diverse talent" OR "professional association")`
  ].join('\n')
}

function buildWeeklyReport(request: AiAssistantRequest): string {
  const { metrics } = request.snapshot
  const openCritical = request.snapshot.requirements.filter((requirement) => requirement.status === 'Open' && requirement.priority === 'Critical')

  return [
    'Weekly recruitment report placeholder',
    `- Open requirements: ${metrics.openRequirements}; critical open roles: ${openCritical.length}.`,
    `- Active candidates: ${metrics.activeCandidates}; profiles sourced: ${metrics.profilesSourced}; contacted: ${metrics.contacted}; interested: ${metrics.interested}.`,
    `- Interviews scheduled: ${metrics.interviewsScheduled}; offers released: ${metrics.offersReleased}; offers accepted: ${metrics.offersAccepted}; joined: ${metrics.joined}.`,
    `- Offer drops: ${metrics.offerDrops}; average days to close: ${metrics.averageDaysToClose}.`,
    `- Priority focus: ${openCritical.map((requirement) => `${requirement.reqId} ${requirement.roleTitle}`).join('; ') || 'No critical open roles currently flagged.'}`,
    '- Placeholder action plan: refresh intake completeness, validate shortlisted profiles, and clear pending feedback with hiring managers.'
  ].join('\n')
}

function buildOfferDropAnalysis(request: AiAssistantRequest): string {
  const droppedCandidates = request.snapshot.candidates.filter((candidate) => /offer dropped/i.test(candidate.status))
  if (droppedCandidates.length === 0) {
    return [
      'Offer drop analysis placeholder',
      '- No offer drops are currently recorded in the workspace.',
      '- Preventive checks: confirm compensation expectations early, validate notice period and competing offers, and keep hiring manager feedback loops short.',
      '- Data to capture later: drop reason, counteroffer details, compensation delta, joining risk, and replacement candidate readiness.'
    ].join('\n')
  }

  return [
    'Offer drop analysis placeholder',
    `- Offer drops recorded: ${droppedCandidates.length}.`,
    `- Candidates: ${droppedCandidates.map((candidate) => `${candidate.name} (${candidate.requirementTitle})`).join('; ')}.`,
    '- Likely rule-based risk themes to validate: compensation mismatch, notice-period movement, competing offer, role fit concerns, and delayed engagement.',
    '- Suggested action: tag each drop with a structured reason and compare against stage duration and expected CTC variance.'
  ].join('\n')
}

const actionTitles: Record<AiAssistantAction, string> = {
  'intake-summary': 'Generated intake summary',
  'hiring-manager-update-email': 'Generated hiring manager update email',
  'candidate-fitment-summary': 'Generated candidate fitment summary',
  'search-strings': 'Generated search strings',
  'weekly-recruitment-report': 'Generated weekly recruitment report',
  'offer-drop-analysis': 'Offer drop analysis'
}

export class LocalRuleBasedAiAssistantProvider implements AiAssistantProvider {
  readonly id = 'local-rule-based'
  readonly label = 'Local rule-based placeholder'

  async generate(request: AiAssistantRequest): Promise<AiAssistantResult> {
    const contentByAction: Record<AiAssistantAction, () => string> = {
      'intake-summary': () => buildIntakeSummary(request),
      'hiring-manager-update-email': () => buildHiringManagerUpdate(request),
      'candidate-fitment-summary': () => buildCandidateFitment(request),
      'search-strings': () => buildSearchStrings(request),
      'weekly-recruitment-report': () => buildWeeklyReport(request),
      'offer-drop-analysis': () => buildOfferDropAnalysis(request)
    }

    return {
      title: actionTitles[request.action],
      generatedAt: new Date().toISOString(),
      provider: this.label,
      content: contentByAction[request.action]()
    }
  }
}

export const aiAssistantProvider: AiAssistantProvider = new LocalRuleBasedAiAssistantProvider()
