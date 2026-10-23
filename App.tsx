import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { fetchMe, logout } from "./src/api/auth";
import type { SessionUser } from "./src/api/types";
import { clearToken, readToken } from "./src/auth/storage";
import { AdminPanel } from "./src/screens/AdminPanel";
import { ForgotPasswordScreen } from "./src/screens/ForgotPasswordScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ResetPasswordScreen } from "./src/screens/ResetPasswordScreen";
import { Workspace } from "./src/screens/Workspace";

type Screen = "loading" | "login" | "forgot" | "reset" | "workspace" | "panel";

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");

  useEffect(() => {
    const page = globalThis as { document?: { title: string } };
    if (page.document) {
      page.document.title = "Mudi";
    }
  }, []);

  useEffect(() => {
    let active = true;
    readToken()
      .then(async (token) => {
        if (!token) {
          return null;
        }
        const response = await fetchMe();
        return response.data;
      })
      .then((session) => {
        if (!active) {
          return;
        }
        if (!session) {
          setScreen("login");
          return;
        }
        setUser(session);
        setScreen("workspace");
      })
      .catch(async () => {
        await clearToken();
        if (active) {
          setScreen("login");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  function openSession(session: SessionUser) {
    setUser(session);
    setScreen("workspace");
  }

  async function signOut() {
    try {
      await logout();
    } catch {
      // The token is cleared locally even if the server is already signed out.
    }
    await clearToken();
    setUser(null);
    setScreen("login");
  }

  let body = (
    <View className="flex-1 items-center justify-center bg-ink">
      <ActivityIndicator color="#E6A11A" />
    </View>
  );

  if (screen === "login") {
    body = <LoginScreen onSignedIn={openSession} onForgot={() => setScreen("forgot")} />;
  } else if (screen === "forgot") {
    body = (
      <ForgotPasswordScreen
        onBack={() => setScreen("login")}
        onCodeSent={(email, code) => {
          setResetEmail(email);
          setResetCode(code);
          setScreen("reset");
        }}
      />
    );
  } else if (screen === "reset") {
    body = (
      <ResetPasswordScreen
        email={resetEmail}
        initialCode={resetCode}
        onDone={() => setScreen("login")}
      />
    );
  } else if (screen === "workspace" && user) {
    body = (
      <Workspace
        user={user}
        onUser={setUser}
        onSignOut={signOut}
        onOpenPeople={() => setScreen("panel")}
      />
    );
  } else if (screen === "panel" && user?.role.slug === "admin") {
    body = <AdminPanel onBack={() => setScreen("workspace")} onSignOut={signOut} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {body}
    </SafeAreaProvider>
  );
}
