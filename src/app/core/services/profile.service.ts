import { Injectable } from '@angular/core';
import { CandidateProfile } from '../models';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private key = 'rms_profiles';

  private load(): CandidateProfile[] {
    try { return JSON.parse(localStorage.getItem(this.key) || '[]'); } catch { return []; }
  }
  private save(profiles: CandidateProfile[]): void {
    localStorage.setItem(this.key, JSON.stringify(profiles));
  }

  getByUserId(userId: string): CandidateProfile | null {
    return this.load().find(p => p.userId === userId) || null;
  }

  getById(id: string): CandidateProfile | null {
    return this.load().find(p => p.id === id) || null;
  }

  create(data: Omit<CandidateProfile, 'id' | 'ref' | 'createdAt'>): { success: boolean; profile?: CandidateProfile; error?: string } {
    const profiles = this.load();
    if (profiles.find(p => p.userId === data.userId)) {
      return { success: false, error: 'This account already has a candidate profile.' };
    }
    if (profiles.find(p => p.email.toLowerCase() === data.email.toLowerCase())) {
      return { success: false, error: 'This email is already linked to another profile.' };
    }
    const profile: CandidateProfile = {
      ...data,
      id: 'cp-' + Date.now(),
      ref: 'REF-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000),
      createdAt: new Date().toISOString()
    };
    profiles.push(profile);
    this.save(profiles);
    return { success: true, profile };
  }

  update(id: string, data: Partial<CandidateProfile>): { success: boolean; error?: string } {
    const profiles = this.load();
    const idx = profiles.findIndex(p => p.id === id);
    if (idx === -1) return { success: false, error: 'Profile not found.' };
    const emailConflict = profiles.find(p => p.email.toLowerCase() === data.email?.toLowerCase() && p.id !== id);
    if (emailConflict) return { success: false, error: 'Email already used by another profile.' };
    profiles[idx] = { ...profiles[idx], ...data };
    this.save(profiles);
    return { success: true };
  }
}
