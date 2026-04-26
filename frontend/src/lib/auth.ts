export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  university?: string;
  department?: string;
  streak: number;
  totalStudyTime: number;
  token?: string;
}

const TOKEN_KEY = "studysync_token";
const USER_KEY = "studysync_user";

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },
  getUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  },
  setUser(user: AuthUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearUser(): void {
    localStorage.removeItem(USER_KEY);
  },
  clearAll(): void {
    this.clearToken();
    this.clearUser();
  },
};
