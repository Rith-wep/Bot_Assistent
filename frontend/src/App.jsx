import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Landing from "./pages/landing/Landing";

// The dashboard app is its own lazy chunk — a landing-page visitor should
// never download recharts, qrcode.react, or any dashboard page just to
// read the marketing site at "/".
const AppShell = lazy(() => import("./AppShell"));
const MiniShop = lazy(() => import("./pages/mini/MiniShop"));

function AppShellLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <p className="text-sm text-ink-muted">Loading...</p>
    </div>
  );
}

function MiniAppLoading() {
  return (
    <div className="min-h-screen bg-white px-4 py-5">
      <div className="mx-auto max-w-md">
        <div className="h-8 w-40 animate-pulse rounded-md bg-gray-200" />
        <div className="mt-4 h-11 animate-pulse rounded-xl bg-gray-200" />
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
              <div className="aspect-square animate-pulse rounded-lg bg-gray-200" />
              <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-gray-200" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// The app used to live at these bare paths before it moved under /app.
// Redirect old bookmarks/open tabs to the new location instead of dumping
// people on the marketing page.
const LEGACY_APP_PATHS = [
  "/dashboard",
  "/knowledge",
  "/leads",
  "/conversations",
  "/conversations/:id",
  "/settings",
  "/admin",
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
];

function LegacyRedirect() {
  const location = useLocation();
  return <Navigate to={`/app${location.pathname}`} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/mini/shop/:businessId"
        element={
          <Suspense fallback={<MiniAppLoading />}>
            <MiniShop />
          </Suspense>
        }
      />
      <Route
        path="/app/*"
        element={
          <Suspense fallback={<AppShellLoading />}>
            <AuthProvider>
              <AppShell />
            </AuthProvider>
          </Suspense>
        }
      />
      {LEGACY_APP_PATHS.map((path) => (
        <Route key={path} path={path} element={<LegacyRedirect />} />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
