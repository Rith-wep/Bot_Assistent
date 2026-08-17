import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Landing from "./pages/landing/Landing";

// The dashboard app is its own lazy chunk — a landing-page visitor should
// never download recharts, qrcode.react, or any dashboard page just to
// read the marketing site at "/".
const AppShell = lazy(() => import("./AppShell"));

function AppShellLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <p className="text-sm text-ink-muted">Loading...</p>
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
        path="/app/*"
        element={
          <Suspense fallback={<AppShellLoading />}>
            <AppShell />
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
