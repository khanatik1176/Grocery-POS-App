import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { fetchMe, login, logout } from "../api/auth";
import type { SessionUser } from "../api/types";
import { clearToken, readToken, saveToken } from "./storage";

type Session = {
  status: "loading" | "signed-out" | "signed-in";
  user: SessionUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (code: string) => boolean;
  canAny: (...codes: string[]) => boolean;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Session["status"]>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let active = true;
    readToken()
      .then(async (token) => (token ? (await fetchMe()).data : null))
      .then((session) => {
        if (!active) {
          return;
        }
        setUser(session);
        setStatus(session ? "signed-in" : "signed-out");
      })
      .catch(async () => {
        await clearToken();
        if (active) {
          setStatus("signed-out");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await login(email, password);
    await saveToken(response.data.token);
    setUser(response.data.user);
    setStatus("signed-in");
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch {
      // The token is cleared locally even if the server is already signed out.
    }
    await clearToken();
    setUser(null);
    setStatus("signed-out");
  }, []);

  const refresh = useCallback(async () => {
    try {
      setUser((await fetchMe()).data);
    } catch {
      // Keep the current session; a rejected token is handled on next launch.
    }
  }, []);

  const value = useMemo<Session>(() => {
    const can = (code: string) => !!user && (user.role.slug === "admin" || (user.capabilities ?? []).includes(code));
    return {
      status,
      user,
      signIn,
      signOut,
      refresh,
      can,
      canAny: (...codes: string[]) => codes.some(can),
    };
  }, [status, user, signIn, signOut, refresh]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return session;
}
