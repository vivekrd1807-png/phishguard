import { BrainCircuit, History, LayoutDashboard, Layers, LifeBuoy, Radar, ScanSearch, Settings, UserCircle } from "lucide-react";

// Sidebar sections. `group` is the small heading shown above each block of links.
export const NAV_GROUPS = [
  {
    group: "Detection",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/ensemble", label: "Ensemble Feature", icon: Layers },
    ],
  },
  {
    group: "Insights",
    items: [
      { to: "/threat-intelligence", label: "Threat Intelligence", icon: Radar },
      { to: "/feature-analysis", label: "Feature Analysis", icon: ScanSearch },
      { to: "/explainability", label: "AI Explainability", icon: BrainCircuit },
    ],
  },
  {
    group: "Workspace",
    items: [
      { to: "/history", label: "Scan History", icon: History },
      { to: "/settings", label: "Settings", icon: Settings },
      { to: "/help", label: "Help & Support", icon: LifeBuoy },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

// Pages reachable from the global search box (sidebar pages plus the profile page).
export const SEARCHABLE_PAGES = [...NAV_ITEMS, { to: "/profile", label: "My Profile", icon: UserCircle }];

// Breadcrumb labels for every route segment.
export const CRUMB_LABELS = {
  dashboard: "Dashboard", ensemble: "Ensemble Feature", "threat-intelligence": "Threat Intelligence",
  "feature-analysis": "Feature Analysis", explainability: "AI Explainability", history: "Scan History",
  settings: "Settings", help: "Help & Support", profile: "My Profile", unauthorized: "Access denied",
};
