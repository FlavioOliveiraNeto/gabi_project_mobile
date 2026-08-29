import api from "./api";

export type Role = "therapist" | "client";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  must_change_password?: boolean;
}

export interface MeResult {
  user: User;
  csrf_token: string;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post("/users/password", { user: { email } });
}

export async function confirmPasswordReset(
  token: string,
  password: string,
  passwordConfirmation: string,
): Promise<void> {
  await api.put("/users/password", {
    user: {
      reset_password_token: token,
      password,
      password_confirmation: passwordConfirmation,
    },
  });
}

export async function changePasswordRequest(
  currentPassword: string,
  password: string,
  passwordConfirmation: string,
): Promise<void> {
  await api.put("/users/change_password", {
    current_password: currentPassword,
    password,
    password_confirmation: passwordConfirmation,
  });
}

export async function forcedChangePasswordRequest(
  password: string,
  passwordConfirmation: string,
): Promise<void> {
  await api.put("/users/change_password", {
    password,
    password_confirmation: passwordConfirmation,
  });
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<MeResult> {
  const { data } = await api.post<MeResult>("/users/sign_in", {
    user: { email, password },
  });
  return { user: data.user, csrf_token: data.csrf_token };
}

export async function getMeRequest(): Promise<MeResult> {
  const { data } = await api.get<MeResult>("/auth/me");
  return { user: data.user, csrf_token: data.csrf_token };
}
