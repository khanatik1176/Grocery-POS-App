import { api } from "./client";

export type HealthResponse = {
  status: string;
  database: string;
  engine: string;
  detail?: string;
};

export function fetchHealth() {
  return api.get<HealthResponse>("/api/health/");
}
