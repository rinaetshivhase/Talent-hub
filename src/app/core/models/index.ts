// ── Auth ──────────────────────────────────────────────────────────
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  mustChangePassword: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface CreateRecruiterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  jobTitle: string;
}

// ── Candidate ─────────────────────────────────────────────────────
// NOTE: `address` was removed from these DTOs by the backend team.
// Address is now its own resource — see AddressResponse below.
export interface CreateCandidateRequest {
  userId: number;
  phone?: string;
  gender?: string;
  race?: string;
  nationality?: string;
  dateOfBirth?: string;
}

export interface UpdateCandidateRequest {
  phone?: string;
  gender?: string;
  race?: string;
  nationality?: string;
  dateOfBirth?: string;
}

export interface CandidateResponse {
  candidateId: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender?: string;
  race?: string;
  nationality?: string;
  dateOfBirth?: string;
  registeredAt: string;
  uploadedDocumentTypes: string[];
}

// ── Addresses ─────────────────────────────────────────────────────
export type AddressType = 'Residential' | 'Postal';

export interface CreateAddressRequest {
  addressType: AddressType;
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string; // 4-digit SA format, e.g. "2196"
  country?: string; // defaults to "South Africa" server-side
}

export interface UpdateAddressRequest {
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string;
}

export interface AddressResponse {
  addressId: number;
  candidateId: number;
  addressType: string; // 'Residential' | 'Postal'
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  createdAt: string;
  updatedAt?: string;
}

// ── Documents ─────────────────────────────────────────────────────
export interface CandidateDocumentResponse {
  candidateDocumentId: number;
  candidateId: number;
  documentType: string; // 'CV' | 'MatricCertificate' | 'Qualification' | 'Certification' | 'Other'
  fileUrl: string;
  originalFileName: string;
  uploadedAt: string;
  qualificationId?: number;
}

export interface MandatoryDocumentsStatusResponse {
  candidateId: number;
  hasCv: boolean;
  hasMatricCertificate: boolean;
  allMandatoryDocumentsPresent: boolean;
  missingDocumentTypes: string[];
}

// ── Vacancies ─────────────────────────────────────────────────────
export interface RequiredDocumentDto {
  documentType: string; // matches DocumentType enum: CV, MatricCertificate, Qualification, Certification, Other
  isMandatory: boolean;
}

export interface VacancyResponse {
  vacancyId: number;
  title: string;
  description: string;
  vacancyType: string; // 'Internal' | 'ClientPlacement'
  departmentId?: number;
  clientId?: number;
  employmentType: string; // 'Permanent' | 'Contract' | 'Internship' | 'PartTime'
  salaryMin?: number;
  salaryMax?: number;
  location: string;
  closingDate?: string;
  minYearsExperience?: number;
  requiredQualifications: string;
  requirements: string;
  status: string; // 'Draft' | 'Published' | 'Closed'
  createdByRecruiterId: number;
  createdAt: string;
  skills: VacancySkillDto[];
  requiredDocuments: RequiredDocumentDto[]; // ← NEW: recruiter-defined docs for this specific vacancy
}

// ── Applications ──────────────────────────────────────────────────
export interface CreateApplicationRequest {
  candidateId: number;
  vacancyId: number;
}
export interface VacancySkillDto {
  skillId: number;
  isRequired: boolean;
  proficiencyLevel: string;
}
export interface ApplicationResponse {
  applicationId: number;
  candidateId: number;
  candidateName: string;
  vacancyId: number;
  vacancyTitle: string;
  status: string; // 'Applied' | 'UnderReview' | 'Shortlisted' | 'OfferExtended' | 'Hired' | 'NotSelected'
  appliedAt: string;
  updatedAt?: string;
}
export interface ApplicationReviewResponse {
  application: {
    applicationId: number;
    status: string;
    appliedAt: string;
  };
  candidate: {
    candidateId: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    cvUrl?: string;
    skills: {
      skillId: number;
      skillName: string;
      category: string;
      proficiencyLevel: string;
    }[];
    qualifications: {
      name: string;
      institution: string;
      yearCompleted: string;
    }[];
    certifications: {
      name: string;
      institution: string;
      yearCompleted: string;
    }[];
    experiences: {
      company: string;
      role: string;
      startDate: string;
      endDate?: string;
      projectsAndDuties?: string;
    }[];
  };
  vacancy: {
    vacancyId: number;
    title: string;
    description: string;
    employmentType: string;
    location?: string;
    minYearsExperience?: number;
    requiredQualifications: string;
    requirements: string;
    vacancyType: string;
    postedFor?: string;
    requiredSkills: {
      skillId: number;
      skillName: string;
      isRequired: boolean;
      proficiencyLevel?: string;
    }[];
  };
}
export interface UpdateApplicationStatusRequest {
  newStatus: string;
  // Optional - the backend now derives who made the change from the logged-in user's
  // token, not from this field. Kept optional rather than removed in case anything
  // else still references it, but it's safe to omit when calling updateStatus().
  changedByUserId?: number;
}

export interface ApplicationStatusHistoryResponse {
  applicationStatusHistoryId: number;
  oldStatus: string;
  newStatus: string;
  changedByName: string;
  changedAt: string;
}

// ── API Error shape ───────────────────────────────────────────────
export interface ApiError {
  message: string;
  missingDocumentTypes?: string[];
}
export interface VacancySkillInput {
  skillId: number;
  isRequired: boolean;
  proficiencyLevel: string;
}

export interface RequiredDocumentInput {
  documentType: string;
  isMandatory: boolean;
}

export interface CreateVacancyRequest {
  recruiterId: number;
  title: string;
  description: string;
  vacancyType: 'Internal' | 'ClientPlacement';
  departmentId?: number;
  clientId?: number;
  employmentType: string;
  salaryMin?: number;
  salaryMax?: number;
  location: string;
  closingDate: string;
  minYearsExperience: number;
  requiredQualifications: string;
  requirements?: string;
  skills: VacancySkillInput[];
  requiredDocuments: RequiredDocumentInput[];
}

export interface UpdateVacancyRequest extends Omit<
  CreateVacancyRequest,
  'recruiterId'
> {}
export interface SkillResponse {
  skillId: number;
  name: string;
  category: string;
}

export interface DepartmentResponse {
  departmentId: number;
  name: string;
  isActive: boolean;
}

export interface ClientResponse {
  clientId: number;
  clientName: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface RecruiterResponse {
  recruiterId: number;
  userId: number;
  jobTitle?: string;
  fullName?: string;
  email?: string;
}
// ── Client (admin) ──────────────────────────────────────────────
export interface CreateClientRequest {
  clientName: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
}

// ── Candidate Skills ─────────────────────────────────────────────
export interface CandidateSkillResponse {
  candidateSkillId: number;
  skillId: number;
  skillName: string;
  category: string;
  proficiencyLevel: string;
  addedAt: string;
}

export interface AssignSkillsRequest {
  skills: { skillId: number; proficiencyLevel: string }[];
}

// ── Candidate Experience ──────────────────────────────────────────
export interface CreateExperienceRequest {
  company: string;
  role: string;
  startDate: string;
  endDate?: string;
  projectsAndDuties?: string;
}

export interface ExperienceResponse {
  candidateExperienceId: number;
  candidateId: number;
  company: string;
  role: string;
  startDate: string;
  endDate?: string;
  projectsAndDuties?: string;
}

// ── Candidate Qualifications ──────────────────────────────────────
export type QualificationType = 'Education' | 'Certification';

export interface CreateQualificationRequest {
  qualificationType: QualificationType;
  name: string;
  institution: string;
  yearCompleted: string; // ISO date string — backend stores this as DateTime, not a plain year
}

export interface QualificationResponse {
  candidateQualificationId: number;
  candidateId: number;
  qualificationType: string;
  name: string;
  institution: string;
  yearCompleted: string;
}
// ── Interviews ────────────────────────────────────────────────────
export type InterviewType = 'InPerson' | 'Virtual' | 'Phone';

export interface ScheduleInterviewRequest {
  interviewType: InterviewType;
  scheduledAt: string; // ISO string
  location?: string;
  meetingLink?: string;
}

export interface RescheduleInterviewRequest {
  scheduledAt: string;
  location?: string;
  meetingLink?: string;
}

export interface SetInterviewOutcomeRequest {
  outcome: 'Passed' | 'Failed';
  recruiterNotes?: string;
}

export interface InterviewResponse {
  interviewId: number;
  applicationId: number;
  candidateId: number;
  candidateName: string;
  vacancyId: number;
  vacancyTitle: string;
  roundNumber: number;
  interviewType: string;
  scheduledAt: string;
  location?: string;
  meetingLink?: string;
  status: string; // 'Scheduled' | 'Completed' | 'Cancelled'
  outcome: string; // 'Pending' | 'Passed' | 'Failed'
  recruiterNotes?: string;
  createdAt: string;
  completedAt?: string;
}

//_______Precreening_________________
export interface PrescreeningResponse {
  prescreeningId: number;
  applicationId: number;
  candidateId: number;
  candidateName: string;
  vacancyId: number;
  vacancyTitle: string;
  status: string;
  sentAt: string;
  completedFileUrl: string | null;
  completedOriginalFileName: string | null;
  submittedAt: string | null;
  outcome: string;
  recruiterNotes: string | null;
  reviewedAt: string | null;
}

// ── Notifications ─────────────────────────────────────────────────
export interface NotificationResponse {
  notificationId: number;
  notificationType: string;
  subject: string;
  body: string;
  isRead: boolean;
  sentAt: string;
}

export interface UnreadCountResponse {
  unreadCount: number;
}
