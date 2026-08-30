import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { prefetchApi } from "../api/client";
import { APP_NAVIGATION } from "../config/navigation";
import { useAuth } from "../context/AuthContext";

const PREFETCH_PATHS = {
  "/app/dashboard": ["/dashboard/summary"],
  "/app/knowledge": ["/knowledge"],
  "/app/leads": ["/leads?page=1&page_size=20"],
  "/app/conversations": ["/conversations?page=1&page_size=20"],
  "/app/settings": ["/settings/core", "/settings/ai-profile"],
};

function prefetchRoute(to) {
  for (const path of PREFETCH_PATHS[to] || []) {
    prefetchApi(path);
  }
}

function NavItems({ orientation }) {
  const isRow = orientation === "row";
  const { businessType } = useAuth();
  return (
    <>
      {APP_NAVIGATION.map(({ to, label, icon: Icon }) => {
        const displayLabel =
          businessType === "product_retail" && to === "/app/knowledge"
            ? "Products"
            : businessType === "product_retail" && to === "/app/leads"
              ? "Orders"
              : label;
        return (
          <NavLink
            key={to}
            to={to}
            onFocus={() => prefetchRoute(to)}
            onMouseEnter={() => prefetchRoute(to)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg font-medium transition-colors duration-150 ${
                isRow ? "flex-col gap-1 px-3 py-1.5 text-[11px]" : "px-3 py-2 text-sm"
              } ${
                isActive
                  ? "bg-accent-soft text-accent-dark shadow-sm"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              }`
            }
          >
            <Icon className={isRow ? "h-5 w-5" : "h-[18px] w-[18px]"} strokeWidth={2} />
            {displayLabel}
          </NavLink>
        );
      })}
    </>
  );
}

export default function Sidebar() {
  const { businessName, businessLogo } = useAuth();
  const [logoFailed, setLogoFailed] = useState(false);
  const showUploadedLogo = businessLogo && !logoFailed;
  const fallbackLetter = (businessName || "WeCare").trim().charAt(0).toUpperCase();

  useEffect(() => {
    setLogoFailed(false);
  }, [businessLogo]);

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-white sm:flex">
        <button type="button" className="mx-3 mt-3 flex min-h-14 items-center gap-3 rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-left shadow-sm transition-colors duration-150 hover:bg-gray-50">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            {showUploadedLogo ? (
              <img
                src={businessLogo}
                alt={`${businessName || "Business"} logo`}
                className="h-full w-full object-cover"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-accent-soft font-heading text-base font-bold text-accent-dark">
                {fallbackLetter}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-sm font-bold text-gray-900">
              {businessName || "WeCare"}
            </p>
            <p className="text-xs font-medium text-gray-500">Workspace</p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} />
        </button>
        <nav className="flex-1 space-y-1 px-3 py-4">
          <NavItems orientation="col" />
        </nav>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex items-stretch justify-around border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] sm:hidden">
        <NavItems orientation="row" />
      </nav>
    </>
  );
}
