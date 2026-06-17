import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getUserRole } from "@/lib/auth";

type AppRole = "admin" | "student";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  isAdmin: boolean;
  onboardingCompleted: boolean;
  markOnboardingComplete: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompletedAt, setOnboardingCompletedAt] = useState<string | null>(null);

  const fetchOnboarding = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("user_id", userId)
      .maybeSingle();
    setOnboardingCompletedAt((data as any)?.onboarding_completed_at ?? null);
  }, []);

  const markOnboardingComplete = useCallback(async () => {
    if (!user) return;
    if (onboardingCompletedAt) return;
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed_at: nowIso } as any)
      .eq("user_id", user.id);
    if (!error) setOnboardingCompletedAt(nowIso);
  }, [user, onboardingCompletedAt]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth event:", event);
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setRole(null);
          setOnboardingCompletedAt(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setTimeout(() => {
            Promise.all([
              getUserRole(session.user.id).then((r) => setRole(r as AppRole)),
              fetchOnboarding(session.user.id),
            ]).finally(() => setLoading(false));
          }, 0);
        } else {
          setRole(null);
          setOnboardingCompletedAt(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        Promise.all([
          getUserRole(session.user.id).then((r) => setRole(r as AppRole)),
          fetchOnboarding(session.user.id),
        ]).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            setSession(null);
            setUser(null);
            setRole(null);
            setOnboardingCompletedAt(null);
          } else {
            setSession(session);
            setUser(session?.user ?? null);
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchOnboarding]);

  const value = {
    user,
    session,
    role,
    loading,
    isAdmin: role === "admin",
    onboardingCompleted: !!onboardingCompletedAt,
    markOnboardingComplete,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
