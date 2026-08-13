import { LogOut } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  const { isAuthenticated, businessName, logout } = useAuth();
  const location = useLocation();

  // Onboarding renders its own full-page shell — no dashboard sidebar/nav.
  if (!isAuthenticated || location.pathname.startsWith("/app/onboarding")) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="h-14 border-b border-gray-200 bg-white">
          <div className="mx-auto flex h-full w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <span className="truncate font-heading text-sm font-bold text-ink">
              {businessName || "Dashboard"}
            </span>
            <button
              onClick={logout}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-gray-100"
              aria-label="Sign out"
            >
              <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
            </button>
          </div>
        </header>

        <main className="flex-1 pb-20 sm:pb-8">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
