import { Injectable } from '@angular/core';
import { Vacancy, Application, StatusEvent } from '../models';

const SEED_VACANCIES: Vacancy[] = [
  { id:'v1', ref:'JDF-VAC-001', title:'Junior Systems Analyst', department:'Information Technology', type:'Permanent', location:'Midrand', salary:'R18 000 – R24 000 pm', closingDate:'2026-08-15', status:'Published', description:'Support the IT team in analysing, designing and implementing business systems across client sites. Exposure to .NET and SQL Server advantageous.', requirements:['Diploma or degree in IT or related field','1+ years systems analysis experience','Knowledge of .NET or SQL Server advantageous'] },
  { id:'v2', ref:'JDF-VAC-002', title:'HR Compliance Officer', department:'Human Resources', type:'Permanent', location:'Sandton', salary:'R22 000 – R28 000 pm', closingDate:'2026-08-20', status:'Published', description:'Ensure adherence to labour legislation, SETA reporting, and B-BBEE compliance frameworks. Knowledge of Employment Equity Act essential.', requirements:['HR degree or equivalent','Knowledge of Labour Relations Act and BCEA','B-BBEE and SETA reporting experience'] },
  { id:'v3', ref:'JDF-VAC-003', title:'Finance Graduate', department:'Finance', type:'Internship', location:'Randburg', salary:'R8 500 pm stipend', closingDate:'2026-08-31', status:'Published', description:'12-month internship within the Finance division. Candidate must hold a BCom degree and be available to start 1 August 2026.', requirements:['BCom degree (Accounting or Finance)','Available from 1 August 2026','Strong Excel skills'] },
  { id:'v4', ref:'JDF-VAC-004', title:'Operations Coordinator', department:'Operations', type:'Contract', location:'Pretoria', salary:'R16 000 – R20 000 pm', closingDate:'2026-09-05', status:'Published', description:'Coordinate day-to-day operational activities, manage schedules, and liaise with cross-functional teams. 12-month fixed-term contract.', requirements:['3+ years operations experience','Strong organisational and communication skills','Proficiency in MS Office'] },
  { id:'v5', ref:'JDF-VAC-005', title:'Software Engineer (.NET)', department:'Engineering', type:'Permanent', location:'Midrand', salary:'R35 000 – R45 000 pm', closingDate:'2026-09-10', status:'Published', description:'Design and build enterprise-grade .NET 8 applications and Windows Services. Strong C#, EF Core and SQL Server skills required.', requirements:['3+ years .NET development experience','C# and EF Core proficiency','SQL Server and REST API knowledge'] },
  { id:'v6', ref:'JDF-VAC-006', title:'Payroll Administrator', department:'Finance', type:'Permanent', location:'Johannesburg', salary:'R20 000 – R25 000 pm', closingDate:'2026-08-25', status:'Published', description:'Process monthly payroll for 200+ employees. VIP Payroll experience essential. Knowledge of PAYE, UIF and SDL advantageous.', requirements:['VIP Payroll experience essential','Knowledge of PAYE, UIF, SDL','3+ years payroll administration'] },
];

@Injectable({ providedIn: 'root' })
export class VacancyService {
  private key = 'rms_vacancies';

  constructor() { if (!localStorage.getItem(this.key)) { localStorage.setItem(this.key, JSON.stringify(SEED_VACANCIES)); } }

  getAll(status = 'Published'): Vacancy[] {
    const all: Vacancy[] = JSON.parse(localStorage.getItem(this.key) || '[]');
    return status ? all.filter(v => v.status === status) : all;
  }

  getById(id: string): Vacancy | null {
    return (JSON.parse(localStorage.getItem(this.key) || '[]') as Vacancy[]).find(v => v.id === id) || null;
  }
}

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private key = 'rms_applications';

  private load(): Application[] {
    try { return JSON.parse(localStorage.getItem(this.key) || '[]'); } catch { return []; }
  }
  private save(apps: Application[]): void { localStorage.setItem(this.key, JSON.stringify(apps)); }

  getByCandidateId(candidateId: string): Application[] {
    return this.load().filter(a => a.candidateId === candidateId);
  }

  hasApplied(candidateId: string, vacancyId: string): boolean {
    return this.load().some(a => a.candidateId === candidateId && a.vacancyId === vacancyId);
  }

  apply(candidateId: string, vacancy: Vacancy, hasDocs: boolean): { success: boolean; error?: string; app?: Application } {
    if (!hasDocs) return { success: false, error: 'Mandatory documents (CV and Matric Certificate) are required before applying.' };
    if (this.hasApplied(candidateId, vacancy.id)) return { success: false, error: 'You have already applied for this vacancy.' };
    if (vacancy.status !== 'Published') return { success: false, error: 'This vacancy is no longer accepting applications.' };
    const now = new Date().toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });
    const app: Application = {
      id: 'app-' + Date.now(),
      ref: 'APP-' + String(this.load().length + 1).padStart(4, '0'),
      candidateId, vacancyId: vacancy.id,
      vacancyTitle: vacancy.title, vacancyRef: vacancy.ref,
      department: vacancy.department, location: vacancy.location, type: vacancy.type,
      status: 'Applied', appliedAt: now,
      history: [{ status: 'Applied', by: 'Candidate', at: now, note: 'Application submitted via portal.' }]
    };
    const apps = this.load();
    apps.push(app);
    this.save(apps);
    return { success: true, app };
  }

  withdraw(appId: string): void {
    const apps = this.load();
    const idx = apps.findIndex(a => a.id === appId);
    if (idx > -1) {
      const now = new Date().toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });
      apps[idx].status = 'Withdrawn';
      apps[idx].history.push({ status: 'Withdrawn', by: 'Candidate', at: now, note: 'Withdrawn by candidate.' });
      this.save(apps);
    }
  }
}
