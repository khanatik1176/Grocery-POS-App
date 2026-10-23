export type Role = {
  id: number;
  name: string;
  slug: string;
};

export type SessionUser = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  capabilities: string[];
};

export type AuthResponse = {
  token: string;
  user: SessionUser;
};
