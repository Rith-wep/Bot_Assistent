import { Bell, ChevronDown, LogOut, User } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  const { isAuthenticated, businessName, businessLogo, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();

  // Onboarding renders its own full-page shell — no dashboard sidebar/nav.
  if (!isAuthenticated || location.pathname.startsWith("/app/onboarding")) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="h-16 border-b border-gray-200 bg-white">
          <div className="mx-auto flex h-full w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <span className="truncate font-heading text-sm font-bold text-gray-900">
              {businessName || "Dashboard"}
            </span>
            <div className="relative flex items-center gap-2">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-900"
                aria-label="Notifications"
              >
                <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="flex min-w-0 items-center gap-2 rounded-lg border border-gray-200 bg-white py-1.5 pl-1.5 pr-2 text-left shadow-sm transition-colors duration-150 hover:bg-gray-50"
                aria-expanded={profileOpen}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-accent-soft font-heading text-sm font-bold text-accent-dark">
                  {businessLogo ? (
                    <img src={businessLogo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (businessName || "U").trim().charAt(0).toUpperCase()
                  )}
                </span>
                <span className="hidden max-w-36 truncate text-sm font-semibold text-gray-900 md:block">
                  {businessName || "Workspace"}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-12 z-30 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                  <div className="border-b border-gray-100 px-3 py-3">
                    <p className="truncate text-sm font-semibold text-gray-900">{businessName || "Workspace"}</p>
                    <p className="mt-0.5 text-xs text-gray-500">Admin dashboard</p>
                  </div>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-50"
                  >
                    <User className="h-4 w-4" strokeWidth={2} />
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-50"
                  >
                    <LogOut className="h-4 w-4" strokeWidth={2} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
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
