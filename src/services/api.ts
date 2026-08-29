import axios, { type AxiosError, type AxiosInstance } from "axios";
import Constants from "expo-constants";

function devApiUrl(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;

  const host = hostUri.split(":")[0];
  return host ? `http://${host}:3000` : null;
}

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? devApiUrl() ?? "http://localhost:3000";

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  withCredentials: true,
});

let _csrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  _csrfToken = token;
}

let _onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null): void {
  _onUnauthorized = fn;
}

api.interceptors.request.use((config) => {
  const method = (config.method ?? "get").toLowerCase();
  const isSafe = method === "get" || method === "head" || method === "options";
  if (!isSafe && _csrfToken) config.headers.set("X-CSRF-Token", _csrfToken);
  return config;
});

export function onResponseError(error: AxiosError): Promise<never> {
  const isSessionProbe = error.config?.url?.includes("/auth/me");

  if (error.response?.status === 401 && !isSessionProbe) {
    setCsrfToken(null);
    _onUnauthorized?.();
  }

  return Promise.reject(error);
}

api.interceptors.response.use((response) => response, onResponseError);

export default api;
