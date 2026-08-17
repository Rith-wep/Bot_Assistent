import { LogOut } from "lucide-react";
import { NavLink } from "react-router-dom";
import { APP_NAVIGATION } from "../config/navigation";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";

function NavItems({ orientation }) {
  const isRow = orientation === "row";
  return (
    <>
      {APP_NAVIGATION.map(({ to, label, icon: Icon }) =>
        (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg font-medium transition-colors duration-150 ${
                isRow ? "flex-col gap-1 px-3 py-1.5 text-[11px]" : "px-3 py-2 text-sm"
              } ${
                isActive
                  ? "bg-accent/15 text-accent"
                  : "text-shell-text-muted hover:bg-white/5 hover:text-shell-text"
              }`
            }
          >
            <Icon className={isRow ? "h-5 w-5" : "h-[18px] w-[18px]"} strokeWidth={2} />
            {label}
          </NavLink>
        )
      )}
    </>
  );
}

export default function Sidebar() {
  const { businessName, logout } = useAuth();

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden w-60 shrink-0 flex-col bg-base sm:flex">
        <div className="mx-3 mt-2 flex min-h-16 items-center gap-2 rounded-xl border border-gray-400 bg-gray-300 px-2.5 py-2 shadow-md">
          <Logo className="h-12 w-16 shrink-0" />
          {businessName ? (
            <span className="truncate font-sans text-base font-bold text-slate-700">
              {businessName}
            </span>
          ) : (
            <span className="font-sans text-xl font-bold tracking-tight">
              <span className="text-accent">We</span>
              <span className="text-slate-500">Care</span>
            </span>
          )}
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          <NavItems orientation="col" />
        </nav>
        <div className="border-t border-shell-border p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-shell-text-muted transition-colors duration-150 hover:bg-white/5 hover:text-shell-text"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex items-stretch justify-around border-t border-shell-border bg-base pb-[env(safe-area-inset-bottom)] sm:hidden">
        <NavItems orientation="row" />
      </nav>
    </>
  );
}
