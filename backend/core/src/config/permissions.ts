export const PERMISSIONS = {
  BROWSE_TALENT: 'browse_talent',
  POST_JOB: 'post_job',
  MANAGE_BENCH: 'manage_bench',
  MANAGE_APPLICATIONS: 'manage_applications',
  VIEW_ANALYTICS: 'view_analytics',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  hr: [
    PERMISSIONS.BROWSE_TALENT,
    PERMISSIONS.POST_JOB,
    PERMISSIONS.MANAGE_APPLICATIONS,
    PERMISSIONS.VIEW_ANALYTICS,
  ],
  employer: [
    PERMISSIONS.MANAGE_BENCH, // Always available
    // POST_JOB and BROWSE_TALENT are conditional (DB-driven via employer_permissions table)
  ],
};
