import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // ---------- Recruiter + Admin (shared pool, but Admin gets read-only views via gate components) ----------
  {
    path: 'admin/vacancies',
    canActivate: [roleGuard(['Recruiter', 'Admin'])],
    loadComponent: () =>
      import('./features/admin/vacancy-list/vacancy-list-gate.component').then(
        (m) => m.VacancyListGateComponent,
      ),
  },
  {
    path: 'admin/vacancies/new',
    canActivate: [roleGuard(['Recruiter'])],
    loadComponent: () =>
      import('./features/admin/create-vacancy/create-vacancy.component').then(
        (m) => m.CreateVacancyComponent,
      ),
  },
  {
    path: 'admin/vacancies/:id/edit',
    canActivate: [roleGuard(['Recruiter'])],
    loadComponent: () =>
      import('./features/admin/create-vacancy/create-vacancy.component').then(
        (m) => m.CreateVacancyComponent,
      ),
  },
  {
    path: 'admin/vacancies/:id',
    canActivate: [roleGuard(['Recruiter', 'Admin'])],
    loadComponent: () =>
      import('./features/admin/vacancy-detail/vacancy-detail-gate.component').then(
        (m) => m.VacancyDetailGateComponent,
      ),
  },
  {
    path: 'admin/applications',
    canActivate: [roleGuard(['Recruiter', 'Admin'])],
    loadComponent: () =>
      import('./features/admin/application-list/application-list-gate.component').then(
        (m) => m.ApplicationListGateComponent,
      ),
  },
  {
    path: 'admin/applications/:id',
    canActivate: [roleGuard(['Recruiter', 'Admin'])],
    loadComponent: () =>
      import('./features/admin/application-detail/application-detail.component').then(
        (m) => m.ApplicationDetailComponent,
      ),
  },
  {
    path: 'admin/templates',
    canActivate: [roleGuard(['Recruiter', 'Admin'])],
    loadComponent: () =>
      import('./features/admin/templates/templates.component').then(
        (m) => m.TemplatesComponent,
      ),
  },
  {
    path: 'admin/applications/:id/candidate',
    canActivate: [roleGuard(['Recruiter', 'Admin'])],
    loadComponent: () =>
      import('./features/admin/candidate-profile/candidate-profile.component').then(
        (m) => m.CandidateProfileComponent,
      ),
  },
  {
    path: 'admin/applications/:id/offer',
    canActivate: [roleGuard(['Recruiter', 'Admin'])],
    loadComponent: () =>
      import('./features/admin/offer-letter/offer-letter-detail.component').then(
        (m) => m.OfferLetterDetailComponent,
      ),
  },
  {
    path: 'applications/review/:id',
    canActivate: [roleGuard(['Recruiter', 'Admin'])],
    loadComponent: () =>
      import('./features/admin/application-list/application-review.component').then(
        (m) => m.ApplicationReviewComponent,
      ),
  },

  // ---------- Read-only for Recruiter+Admin, write actions inside these pages should
  // still check isAdmin in the template before showing create/edit/delete buttons ----------
  {
    path: 'admin/skills',
    canActivate: [roleGuard(['Recruiter', 'Admin'])],
    loadComponent: () =>
      import('./features/admin/skill-list/skill-list.component').then(
        (m) => m.SkillListComponent,
      ),
  },
  {
    path: 'admin/departments',
    canActivate: [roleGuard(['Recruiter', 'Admin'])],
    loadComponent: () =>
      import('./features/admin/department-list/department-list.component').then(
        (m) => m.DepartmentListComponent,
      ),
  },
  {
    path: 'admin/clients',
    canActivate: [roleGuard(['Recruiter', 'Admin'])],
    loadComponent: () =>
      import('./features/admin/client-list/client-list.component').then(
        (m) => m.ClientListComponent,
      ),
  },
  {
    path: 'admin/recruiters',
    canActivate: [roleGuard(['Recruiter', 'Admin'])],
    loadComponent: () =>
      import('./features/admin/recruiter-list/recruiter-list.component').then(
        (m) => m.RecruiterListComponent,
      ),
  },

  // ---------- Candidate-only self-service pages (these key off "my own" profile,
  // not a candidateId param - Admin has no personal candidate record, and the
  // Create endpoint is Candidate-only on the backend, so Admin is deliberately excluded here) ----------
  {
    path: 'skills',
    canActivate: [roleGuard(['Candidate'])],
    loadComponent: () =>
      import('./features/skills/candidate-skills.component').then(
        (m) => m.CandidateSkillsComponent,
      ),
  },
  {
    path: 'experience',
    canActivate: [roleGuard(['Candidate'])],
    loadComponent: () =>
      import('./features/experience/candidate-experience.component').then(
        (m) => m.CandidateExperienceComponent,
      ),
  },
  {
    path: 'qualifications',
    canActivate: [roleGuard(['Candidate'])],
    loadComponent: () =>
      import('./features/qualifications/candidate-qualifications.component').then(
        (m) => m.CandidateQualificationsComponent,
      ),
  },
  {
    path: 'documents',
    canActivate: [roleGuard(['Candidate'])],
    loadComponent: () =>
      import('./features/documents/documents.component').then(
        (m) => m.DocumentsComponent,
      ),
  },
  {
    path: 'profile',
    canActivate: [roleGuard(['Candidate'])],
    loadComponent: () =>
      import('./features/profile/profile.component').then(
        (m) => m.ProfileComponent,
      ),
  },
  {
    path: 'applications/:id/schedule-interview',
    canActivate: [roleGuard(['Recruiter', 'Admin'])],
    loadComponent: () =>
      import('./features/admin/interviews/schedule-interview.component').then(
        (m) => m.ScheduleInterviewComponent,
      ),
  },
  {
    path: 'applications',
    canActivate: [roleGuard(['Candidate'])],
    loadComponent: () =>
      import('./features/applications/applications.component').then(
        (m) => m.ApplicationsComponent,
      ),
  },

  // ---------- Any authenticated role ----------
  {
    path: 'vacancies',
    canActivate: [roleGuard(['Candidate'])],
    loadComponent: () =>
      import('./features/vacancies/vacancies.component').then(
        (m) => m.VacanciesComponent,
      ),
  },
  {
    path: 'vacancies/:id',
    canActivate: [roleGuard(['Candidate'])],
    loadComponent: () =>
      import('./features/vacancies/vacancy-detail.component').then(
        (m) => m.VacancyDetailComponent,
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard-gate.component').then(
        (m) => m.DashboardGateComponent,
      ),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/settings.component').then(
        (m) => m.SettingsComponent,
      ),
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/notifications/notifications.component').then(
        (m) => m.NotificationsComponent,
      ),
  },

  // ---------- Public ----------
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent,
      ),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },

  { path: '**', redirectTo: 'login' },
];
