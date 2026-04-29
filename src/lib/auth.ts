export const SESSION_KEY = "planhub_session";

export interface PlanhubSession {
  auth_token: string;
  userId: number;
  email: string;
  userType: string;
  userRole: string;
  companyId: string | null;
  superAdmin: string;
}

export interface PlanhubLoginResponse {
  message?: string;
  auth_token: string;
  userId: number;
  email: string;
  userType: string;
  userRole: string;
  companyId: string | null;
  superAdmin: string;
  multiple_accounts?: boolean;
  email_not_verified?: boolean;
  optin_out_of_date?: boolean;
  isArchived?: string;
}

export function getSession(): PlanhubSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as PlanhubSession) : null;
}

export function setSession(session: PlanhubSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated(): boolean {
  return !!getSession();
}

export function getInitials(email: string): string {
  const local = email.split("@")[0];
  const parts = local.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

export function getDisplayName(email: string): string {
  const local = email.split("@")[0];
  return local
    .split(/[._-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}
