import {
  BookOpen,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";

// Keep product navigation in one place. The sidebar and mobile navigation
// consume the same definitions so labels, routes, and icons cannot drift.
export const APP_NAVIGATION = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/knowledge", label: "Knowledge", icon: BookOpen },
  { to: "/app/leads", label: "Leads", icon: Users },
  { to: "/app/conversations", label: "Conversations", icon: MessageSquare },
  { to: "/app/settings", label: "Settings", icon: Settings },
];
