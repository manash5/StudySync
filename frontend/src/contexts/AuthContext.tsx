import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { backendApi, type AuthResponse } from "../lib/api";
import { authStorage, type AuthUser } from "../lib/auth";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (payload: AuthResponse) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => authStorage.getToken());
  const [user, setUser] = useState<AuthUser | null>(() => authStorage.getUser());
  const [loading, setLoading] = useState(true);

  const logout = () => {
    authStorage.clearAll();
    setToken(null);
    setUser(null);
  };

  const login = (payload: AuthResponse) => {
    authStorage.setToken(payload.token);
    authStorage.setUser(payload);
    setToken(payload.token);
    setUser(payload);
  };

  const refreshMe = async () => {
    if (!authStorage.getToken()) {
      setLoading(false);
      return;
    }

    try {
      const me = await backendApi.get<AuthUser>("/auth/me");
      authStorage.setUser(me);
      setUser(me);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshMe();
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      refreshMe,
    }),
    [loading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
