import type { AuthResponse, SessionUser } from "./types";
import { api } from "./client";

export function login(email: string, password: string) {
  return api.post<AuthResponse>("/api/auth/login/", { email, password });
}

export function logout() {
  return api.post("/api/auth/logout/");
}

export function fetchMe() {
  return api.get<SessionUser>("/api/auth/me/");
}

export function requestPasswordReset(email: string) {
  return api.post<{ detail: string; reset_code?: string }>("/api/auth/forgot-password/", {
    email,
  });
}

export function resetPassword(email: string, code: string, password: string) {
  return api.post<{ detail: string }>("/api/auth/reset-password/", {
    email,
    code,
    password,
  });
}
