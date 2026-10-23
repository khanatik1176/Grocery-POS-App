import axios from "axios";
import { Platform } from "react-native";

import { readToken } from "../auth/storage";

const configured = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8001";

function apiBaseURL() {
  if (Platform.OS === "android") {
    return configured.replace("://127.0.0.1", "://10.0.2.2").replace("://localhost", "://10.0.2.2");
  }
  return configured;
}

const baseURL = apiBaseURL();

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await readToken();
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export function mediaUrl(path: string | null) {
  if (!path) {
    return null;
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${baseURL.replace(/\/$/, "")}${path}`;
}

export function apiError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return "Something went wrong.";
  }
  const data = error.response?.data;
  if (typeof data === "string" && data.trim()) {
    return data;
  }
  if (data && typeof data === "object") {
    if ("detail" in data && typeof data.detail === "string") {
      return data.detail;
    }
    for (const value of Object.values(data)) {
      if (typeof value === "string") {
        return value;
      }
      if (Array.isArray(value) && typeof value[0] === "string") {
        return value[0];
      }
    }
  }
  return error.message || "Something went wrong.";
}
