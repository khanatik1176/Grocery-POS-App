import type { Role, SessionUser } from "./types";
import { api } from "./client";

export function fetchRoles() {
  return api.get<Role[]>("/api/admin/roles/");
}

export function createRole(name: string) {
  return api.post<Role>("/api/admin/roles/", { name });
}

export function fetchUsers() {
  return api.get<SessionUser[]>("/api/admin/users/");
}

export function createUser(input: {
  email: string;
  password: string;
  first_name: string;
  last_name?: string;
  role_id: number;
}) {
  return api.post<SessionUser>("/api/admin/users/", input);
}
