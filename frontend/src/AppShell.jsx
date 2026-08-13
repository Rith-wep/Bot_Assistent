import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { apiFetch } from "./api/client";
import Layout from "./components/Layout";
import { useAuth } from "./context/AuthContext";

const Admin = lazy(() => import("./pages/admin/Admin"));
const ConversationDetail = lazy(() => import("./pages/ConversationDetail"));
const Conversations = lazy(() => import("./pages/Conversations"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const KnowledgeEditor = lazy(() => import("./pages/KnowledgeEditor"));
const Leads = lazy(() => import("./pages/Leads"));
const Onboarding = lazy(() => import("./pages/onboarding/Onboarding"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));

function RouteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <p className="text-sm text-ink-muted">Loading...</p>
    </div>
  );
}

// Everything under /app — the actual product, as opposed to the public
// marketing site at "/" (Landing.jsx). Lazy-loaded as its own bundle so a
// landing-page visitor never downloads the dashboard's JS (recharts,
// qrcode.react, every page) just to read the marketing site.
export default function AppShell() {
  const { isAuthenticated } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function checkOnboarding() {
      if (!isAuthenticated) {
        setOnboardingCompleted(null);
        setChecking(false);
        return;
      }
      setChecking(true);
      try {
        const data = await apiFetch("/onboarding/status");
        if (!cancelled) setOnboardingCompleted(data.onboarding_completed);
      } catch {
        if (!cancelled) setOnboardingCompleted(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    checkOnboarding();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (isAuthenticated && checking) {
    return <RouteLoading />;
  }

  const needsOnboarding = isAuthenticated && onboardingCompleted === false;

  function Protected({ children }) {
    if (!isAuthenticated) return <Navigate to="/app/signin" replace />;
    if (needsOnboarding) return <Navigate to="/app/onboarding" replace />;
    return children;
  }

  return (
    <Layout>
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          {/* Relative paths: this <Routes> is itself rendered inside a
              parent <Route path="/app/*">, so paths here are matched
              relative to "/app" — an absolute "/app/dashboard" here would
              not match and silently render nothing. */}
          <Route
            path="signup"
            element={isAuthenticated ? <Navigate to="/app" replace /> : <SignUp />}
          />
          <Route
            path="signin"
            element={isAuthenticated ? <Navigate to="/app" replace /> : <SignIn />}
          />
          <Route
            path="onboarding"
            element={
              !isAuthenticated ? (
                <Navigate to="/app/signin" replace />
              ) : needsOnboarding ? (
                <Onboarding />
              ) : (
                <Navigate to="/app/dashboard" replace />
              )
            }
          />
          <Route
            path="dashboard"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />
          <Route
            path="knowledge"
            element={
              <Protected>
                <KnowledgeEditor />
              </Protected>
            }
          />
          <Route
            path="leads"
            element={
              <Protected>
                <Leads />
              </Protected>
            }
          />
          <Route
            path="conversations"
            element={
              <Protected>
                <Conversations />
              </Protected>
            }
          />
          <Route
            path="conversations/:id"
            element={
              <Protected>
                <ConversationDetail />
              </Protected>
            }
          />
          <Route
            path="settings"
            element={
              <Protected>
                <SettingsPage />
              </Protected>
            }
          />
          <Route
            path="admin"
            element={
              <Protected>
                <Admin />
              </Protected>
            }
          />
          <Route
            index
            element={
              <Navigate
                to={
                  !isAuthenticated
                    ? "/app/signin"
                    : needsOnboarding
                      ? "/app/onboarding"
                      : "/app/dashboard"
                }
                replace
              />
            }
          />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
