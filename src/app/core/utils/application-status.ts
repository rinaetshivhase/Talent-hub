export type ApplicationStatusKey =
  // ── Real backend statuses (matches TalentHub.Models.ApplicationStatus exactly) ──
  | 'Applied'
  | 'UnderReview'
  | 'Shortlisted'
  | 'PrescreeningStage'
  | 'InterviewStage'
  | 'OfferExtended'
  | 'Hired'
  | 'NotSelected'
  // ── Front-end-only overlay stages — never sent to the backend as a real
  // application status, only displayed on top of it. 'OfferSent'/'OfferAccepted'/
  // 'OfferDeclined' overlay 'OfferExtended' (see OfferLetterService).
  | 'OfferSent'
  | 'OfferAccepted'
  | 'OfferDeclined';

// Matches the backend's ApplicationStatusRules exactly:
// Applied → UnderReview → Shortlisted → PrescreeningStage → InterviewStage
// → OfferExtended → Hired, with NotSelected reachable at any active stage.
//
// Two transitions are deliberately left OUT of this manual "move to next
// status" list even though the backend allows them via IsValidTransition:
// - Shortlisted → PrescreeningStage only happens via PrescreeningController.Send()
//   (which also creates the Prescreening record and checks a template exists),
//   never via the plain status-update endpoint. So it's excluded here to steer
//   recruiters through the "Send pre-screening form" button instead.
// - PrescreeningStage → NotSelected on a Failed outcome happens automatically
//   inside PrescreeningController.SetOutcome, not through this dropdown.
const ALLOWED_TRANSITIONS: Record<
  ApplicationStatusKey,
  ApplicationStatusKey[]
> = {
  Applied: ['UnderReview', 'NotSelected'],
  UnderReview: ['Shortlisted', 'NotSelected'],
  Shortlisted: ['PrescreeningStage', 'NotSelected'],
  PrescreeningStage: ['InterviewStage', 'NotSelected'],
  InterviewStage: ['OfferExtended', 'NotSelected'],
  OfferExtended: ['Hired', 'NotSelected'],
  OfferSent: ['NotSelected'], // waiting on the candidate; recruiter can still withdraw
  OfferAccepted: ['Hired'],
  OfferDeclined: ['NotSelected'],
  Hired: [],
  NotSelected: [],
};

export function getValidNextStatuses(current: string): ApplicationStatusKey[] {
  return ALLOWED_TRANSITIONS[current as ApplicationStatusKey] ?? [];
}

export const STATUS_LABELS: Record<ApplicationStatusKey, string> = {
  Applied: 'Applied',
  UnderReview: 'Under Review',
  Shortlisted: 'Shortlisted',
  PrescreeningStage: 'Pre-Screening',
  InterviewStage: 'Interview',
  OfferExtended: 'Offer Extended',
  OfferSent: 'Offer Sent',
  OfferAccepted: 'Offer Accepted',
  OfferDeclined: 'Offer Declined',
  Hired: 'Hired',
  NotSelected: 'Not Selected',
};

export const STATUS_CLASS: Record<ApplicationStatusKey, string> = {
  Applied: 'applied',
  UnderReview: 'underreview',
  Shortlisted: 'shortlisted',
  PrescreeningStage: 'prescreening',
  InterviewStage: 'interview',
  OfferExtended: 'offer',
  OfferSent: 'Offer Sent',
  OfferAccepted: 'Offer Accepted',
  OfferDeclined: 'Offer Declined',
  Hired: 'hired',
  NotSelected: 'rejected',
};

export function statusClass(s: string): string {
  return STATUS_CLASS[s as ApplicationStatusKey] ?? 'applied';
}

export function statusLabel(s: string): string {
  return STATUS_LABELS[s as ApplicationStatusKey] ?? s;
}
