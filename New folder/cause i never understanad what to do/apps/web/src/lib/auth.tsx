import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  role: string;
};

export type AuthContextType = {
  user: AuthUser | null;
  organization: any;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (credentials: { email: string; password: string }) => Promise<{ error?: string }>;
  register: (data: { name: string; email: string; password: string; confirmPassword: string; organizationName?: string }) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  organization: null,
  loading: true,
  refresh: async () => {},
  login: async () => ({}),
  register: async () => ({}),
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await api.auth.me();
      if (data?.user) {
        setUser(data.user);
        setOrganization(data.organization);
      } else {
        setUser(null);
        setOrganization(null);
      }
    } catch {
      setUser(null);
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const data = await api.auth.login(credentials);
    if ((data as any)?.error) return { error: (data as any).error };
    await refresh();
    return {};
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    organizationName?: string;
  }) => {
    const res = await api.auth.register(data);
    if ((res as any)?.error) return { error: (res as any).error };
    await refresh();
    return {};
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
    setOrganization(null);
  };

  return (
    <AuthContext.Provider value={{ user, organization, loading, refresh, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
