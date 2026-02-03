import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth event:", event);
        
        // Atualizar estado da sessão
        setSession(session);
        setUser(session?.user ?? null);
        
        // Tratamento específico para SIGNED_OUT
        if (event === 'SIGNED_OUT') {
          setRole(null);
          setLoading(false);
          return;
        }
        
        // Defer role fetching with setTimeout
        if (session?.user) {
          setTimeout(() => {
            getUserRole(session.user.id).then((userRole) => {
              setRole(userRole as AppRole);
              setLoading(false);
            });
          }, 0);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        getUserRole(session.user.id).then((userRole) => {
          setRole(userRole as AppRole);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Verificar sessão quando usuário volta para a aba
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            // Sessão expirou, limpar estado
            setSession(null);
            setUser(null);
            setRole(null);
          } else {
            // Atualizar sessão se ainda válida
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
  }, []);

  const value = {
    user,
    session,
    role,
    loading,
    isAdmin: role === "admin",
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
