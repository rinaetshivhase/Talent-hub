import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Usage: canActivate: [roleGuard(['Recruiter', 'Admin'])]
 * Redirects to /login if not authenticated, or /dashboard if authenticated
 * but not one of the allowed roles.
 */
export function roleGuard(allowedRoles: string[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const user = auth.currentUser();

    if (!user) {
      router.navigate(['/login']);
      return false;
    }

    if (!allowedRoles.includes(user.role)) {
      router.navigate(['/dashboard']);
      return false;
    }

    return true;
  };
}