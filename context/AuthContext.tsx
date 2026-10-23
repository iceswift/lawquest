import * as Linking from "expo-linking";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/services/auth/supabaseClient";
import type { Session, User } from "@supabase/supabase-js";

export type AuthStatus = "loading" | "guest" | "authenticated";

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  redirectUrl: string;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const AUTH_CALLBACK_PATH = "auth/callback";

function getAuthRedirectUrl() {
  return Linking.createURL(AUTH_CALLBACK_PATH);
}

async function handleAuthCallbackUrl(url: string) {
  const parsedUrl = new URL(url);
  const code = parsedUrl.searchParams.get("code");

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const redirectUrl = useMemo(() => getAuthRedirectUrl(), []);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }

      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    void Linking.getInitialURL().then((url) => {
      if (url) {
        void handleAuthCallbackUrl(url).catch((error) => {
          console.warn("Unable to process auth callback.", error);
        });
      }
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleAuthCallbackUrl(url).catch((error) => {
        console.warn("Unable to process auth callback.", error);
      });
    });

    return () => subscription.remove();
  }, []);

  const sendMagicLink = useCallback(
    async (email: string) => {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        throw new Error("Enter an email address.");
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: true,
        },
      });

      if (error) {
        throw error;
      }
    },
    [redirectUrl],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: loading ? "loading" : session ? "authenticated" : "guest",
      session,
      user: session?.user ?? null,
      redirectUrl,
      sendMagicLink,
      signOut,
    }),
    [loading, redirectUrl, sendMagicLink, session, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
