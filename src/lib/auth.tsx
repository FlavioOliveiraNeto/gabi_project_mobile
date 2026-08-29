import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { AxiosError } from 'axios';

import api, { API_BASE_URL, setCsrfToken, setUnauthorizedHandler } from '@/services/api';
import { getMeRequest, loginRequest, type User } from '@/services/auth';

interface AuthValue {
  user: User | null;
  isBooting: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  clearAuthState: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function loginErrorMessage(err: unknown): string {
  const status = (err as AxiosError)?.response?.status;

  if (status === undefined) {
    return `Sem resposta de ${API_BASE_URL}. Confira o EXPO_PUBLIC_API_URL e se este aparelho alcança o backend.`;
  }
  if (status === 401) return 'E-mail ou senha inválidos.';
  if (status === 429) return 'Muitas tentativas de login. Aguarde alguns minutos.';
  if (status >= 500) return `Erro ${status} no servidor. Veja o log do backend.`;

  return `Falha no login (HTTP ${status}).`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setCsrfToken(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearAuthState);
    return () => setUnauthorizedHandler(null);
  }, [clearAuthState]);

  useEffect(() => {
    let alive = true;
    getMeRequest()
      .then(({ user: apiUser, csrf_token }) => {
        if (!alive) return;
        setUser(apiUser);
        setCsrfToken(csrf_token);
      })
      .catch(() => {
        if (alive) clearAuthState();
      })
      .finally(() => {
        if (alive) setIsBooting(false);
      });
    return () => {
      alive = false;
    };
  }, [clearAuthState]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { user: apiUser, csrf_token } = await loginRequest(email, password);
      setUser(apiUser);
      setCsrfToken(csrf_token);
      return apiUser;
    } catch (err) {
      setError(loginErrorMessage(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.delete('/users/sign_out');
    } catch (error) {
      console.log(error)
    } finally {
      clearAuthState();
    }
  }, [clearAuthState]);

  const value = useMemo(
    () => ({ user, isBooting, isLoading, error, login, logout, clearAuthState }),
    [user, isBooting, isLoading, error, login, logout, clearAuthState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}

export function homeRoute(user: User | null): '/login' | '/trocar-senha' | '/terapeuta' | '/paciente' {
  if (!user) return '/login';
  if (user.role === 'client' && user.must_change_password) return '/trocar-senha';
  return user.role === 'therapist' ? '/terapeuta' : '/paciente';
}
