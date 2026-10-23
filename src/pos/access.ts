import type { SessionUser } from "../api/types";

export function can(user: SessionUser, code: string) {
  return user.role.slug === "admin" || (user.capabilities ?? []).includes(code);
}
