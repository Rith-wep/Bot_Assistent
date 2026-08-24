import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { apiFetch } from "./api/client";
import Layout from "./components/Layout";
import Skeleton from "./components/Skeleton";
import { useAuth } from "./context/AuthContext";

const Admin = lazy(() => import("./pages/admin/Admin"));
const ConversationDetail = lazy(() => import("./pages/ConversationDetail"));
const Conversations = lazy(() => import("./pages/Conversations"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const KnowledgeEditor = lazy(() => import("./pages/KnowledgeEditor"));
const Leads = lazy(() => import("./pages/Leads"));
const Onboarding = lazy(() => import("./pages/onboarding/Onboarding"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));

function RouteLoading() {
  return (
    <div className="min-h-screen bg-page">
      <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
        <Skeleton className="h-4 w-28" />
        <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
      </div>
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="mt-3 h-4 w-64" />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-ink-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
            Loading workspace
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="rounded-xl border border-gray-200 bg-white p-5">
              <Skeleton className="mb-4 h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-3 h-3 w-28" />
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <Skeleton className="mb-5 h-5 w-48" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    </div>
  );
}

function PageLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="mt-3 h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <Skeleton className="mb-4 h-4 w-28" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Everything under /app — the actual product, as opposed to the public
// marketing site at "/" (Landing.jsx). Lazy-loaded as its own bundle so a
// landing-page visitor never downloads the dashboard's JS (recharts,
// qrcode.react, every page) just to read the marketing site.
export default function AppShell() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function checkOnboarding() {
      if (authLoading) return;
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
  }, [authLoading, isAuthenticated]);

  if (authLoading || (isAuthenticated && checking)) {
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
      <Suspense fallback={<PageLoading />}>
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
            path="forgot-password"
            element={isAuthenticated ? <Navigate to="/app" replace /> : <ForgotPassword />}
          />
          <Route path="reset-password" element={<ResetPassword />} />
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
