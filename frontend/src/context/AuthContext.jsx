import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { invalidateApiCache, setAccessTokenProvider } from "../api/client";
import { getSupabase } from "../lib/supabase";

const AuthContext = createContext(null);
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

async function bootstrapProfile(session, business) {
  const response = await fetch(`${API_BASE_URL}/api/auth/bootstrap`, {
    method: "POST",
    cache: "no-store",
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
  if (!data?.user_id || !data?.business_id) {
    throw new Error("Backend API is not configured correctly for this frontend");
  }
  return data;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const bootstrappingTokenRef = useRef(null);
  const sessionRef = useRef(null);
  const profileRef = useRef(null);

  const completeAuthentication = useCallback(async (nextSession, business) => {
    if (!nextSession) {
      bootstrappingTokenRef.current = null;
      setSession(null);
      setProfile(null);
      setLoading(false);
      return null;
    }

    if (
      bootstrappingTokenRef.current === nextSession.access_token &&
      sessionRef.current?.access_token === nextSession.access_token &&
      profileRef.current
    ) {
      setLoading(false);
      return profileRef.current;
    }

    bootstrappingTokenRef.current = nextSession.access_token;
    setLoading(true);
    try {
      const nextProfile = await bootstrapProfile(nextSession, business);
      setSession(nextSession);
      setProfile(nextProfile);
      return nextProfile;
    } catch (error) {
      bootstrappingTokenRef.current = null;
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
      bootstrappingTokenRef.current = null;
      invalidateApiCache();
      setSession(null);
      setProfile(null);
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback((nextProfile) => {
    setProfile((current) => ({ ...current, ...nextProfile }));
  }, []);

  useEffect(() => {
    sessionRef.current = session;
    profileRef.current = profile;
    setAccessTokenProvider(() => session?.access_token || null);
    return () => setAccessTokenProvider(null);
  }, [profile, session]);

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
        if (event === "TOKEN_REFRESHED") {
          setSession(nextSession);
          return;
        }
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          completeAuthentication(nextSession).catch(async () => {
            if (active) await supabase.auth.signOut();
          });
        }
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
        businessLogo: profile?.logo_url || "",
        completeAuthentication,
        updateProfile,
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
