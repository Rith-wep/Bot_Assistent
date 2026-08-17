import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";

const AuthContext = createContext(null);

async function bootstrapProfile(session, business) {
  const response = await fetch("/api/auth/bootstrap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(business || {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.detail || "Unable to initialize your account");
  }
  return data;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const completeAuthentication = useCallback(async (nextSession, business) => {
    if (!nextSession) {
      setSession(null);
      setProfile(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    try {
      const nextProfile = await bootstrapProfile(nextSession, business);
      setSession(nextSession);
      setProfile(nextProfile);
      return nextProfile;
    } catch (error) {
      setSession(null);
      setProfile(null);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await getSupabase().auth.signOut();
    } finally {
      setSession(null);
      setProfile(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let subscription;

    try {
      const supabase = getSupabase();
      supabase.auth.getSession().then(async ({ data, error }) => {
        if (!active) return;
        if (error || !data.session) {
          setLoading(false);
          return;
        }
        try {
          await completeAuthentication(data.session);
        } catch {
          if (active) await supabase.auth.signOut();
        }
      });

      const listener = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (!active) return;
        if (event === "SIGNED_OUT" || !nextSession) {
          setSession(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        if (event === "TOKEN_REFRESHED") setSession(nextSession);
      });
      subscription = listener.data.subscription;
    } catch {
      setLoading(false);
    }

    const unauthorized = () => logout();
    window.addEventListener("auth:unauthorized", unauthorized);
    return () => {
      active = false;
      subscription?.unsubscribe();
      window.removeEventListener("auth:unauthorized", unauthorized);
    };
  }, [completeAuthentication, logout]);

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        isAuthenticated: Boolean(session && profile),
        businessName: profile?.business_name || "",
        completeAuthentication,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
